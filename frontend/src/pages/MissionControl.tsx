import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { KPICard } from '../components/ui/KPICard';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Badge } from '../components/ui/Badge';
import { RiskGauge } from '../components/ui/RiskGauge';
import { AgentFeed } from '../components/ui/AgentFeed';
import type { SSEEvent } from '../components/ui/AgentFeed';
import { useAppState } from '../context/AppStateContext';

// ─── Contract types (mirrored locally) ───────────────────────────────────────

interface KPI {
  label: string;
  value: number;
  unit?: string;
  delta_pct?: number;
  sparkline?: number[];
}

interface AppState {
  sim_date: string;
  autonomy_level: 'supervised' | 'autopilot';
  risk_budget: { used_pct: number; cap_pct: number };
  kpis: KPI[];
  sparklines: Record<string, number[]>;
  is_playing: boolean;
  play_speed: 1 | 2 | 5;
  killswitch_active: boolean;
}

interface Incident {
  id: string;
  metric: string;
  scope: string;
  direction: 'up' | 'down';
  magnitude_pct: number;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'diagnosed' | 'resolved';
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_APP_STATE: AppState = {
  sim_date: '2024-06-15',
  autonomy_level: 'supervised',
  risk_budget: { used_pct: 4.2, cap_pct: 10.0 },
  is_playing: false,
  play_speed: 1,
  killswitch_active: false,
  kpis: [
    {
      label: 'Total Spend', value: 48230, unit: '$', delta_pct: -4.2,
      sparkline: [52100, 51800, 51200, 50900, 50100, 49800, 49500, 49200, 48900, 48700, 48500, 48400, 48300, 48230],
    },
    {
      label: 'Total Revenue', value: 142800, unit: '$', delta_pct: +6.8,
      sparkline: [133500, 134200, 135100, 136400, 137200, 138000, 138900, 139600, 140200, 140800, 141300, 141900, 142400, 142800],
    },
    {
      label: 'Blended ROAS', value: 2.96, unit: 'x', delta_pct: +11.4,
      sparkline: [2.56, 2.59, 2.64, 2.68, 2.74, 2.78, 2.80, 2.82, 2.86, 2.88, 2.90, 2.92, 2.94, 2.96],
    },
    {
      label: 'Total Profit', value: 38420, unit: '$', delta_pct: +9.1,
      sparkline: [35200, 35500, 35800, 36100, 36500, 36800, 37100, 37400, 37700, 37950, 38100, 38250, 38350, 38420],
    },
  ],
  sparklines: {},
};

const MOCK_INCIDENTS: Incident[] = [
  { id: 'INC-001', metric: 'CTR',  scope: 'camp_meta_03',   direction: 'down', magnitude_pct: -32.4, confidence: 0.91, severity: 'high',     status: 'investigating' },
  { id: 'INC-002', metric: 'ROAS', scope: 'camp_google_07', direction: 'down', magnitude_pct: -18.7, confidence: 0.84, severity: 'medium',   status: 'open' },
  { id: 'INC-003', metric: 'CVR',  scope: 'sku_SKU-042',    direction: 'down', magnitude_pct: -41.2, confidence: 0.96, severity: 'critical', status: 'diagnosed' },
  { id: 'INC-004', metric: 'CPM',  scope: 'camp_tiktok_02', direction: 'up',   magnitude_pct: +22.1, confidence: 0.78, severity: 'low',      status: 'open' },
];

const MOCK_SSE_EVENTS: SSEEvent[] = [
  { ts: '2024-06-15T09:14:02Z', type: 'detection',      module: 'sentinel',     message: 'CTR anomaly detected on camp_meta_03 (-32.4%, conf 0.91)',            severity: 'warning' },
  { ts: '2024-06-15T09:14:08Z', type: 'investigation',  module: 'investigator', message: 'Executing creative_breakdown on camp_meta_03',                          severity: 'info' },
  { ts: '2024-06-15T09:14:15Z', type: 'investigation',  module: 'investigator', message: 'Tool call: fatigue_curve(window=14d) → frequency 7.2, CTR decay 38%',  severity: 'info' },
  { ts: '2024-06-15T09:14:22Z', type: 'verification',   module: 'guardian',     message: 'Verified explanation: PASS (E12 matches 0.018 vs 0.028)',              severity: 'success' },
  { ts: '2024-06-15T09:14:29Z', type: 'recommendation', module: 'strategist',   message: 'Recommendation: rotate creative set, shift $1,200 → camp_meta_05',     severity: 'info' },
  { ts: '2024-06-15T09:14:36Z', type: 'execution',      module: 'executor',     message: 'Action queued: pause camp_meta_03, boost camp_meta_05 +$1,200',        severity: 'success' },
  { ts: '2024-06-15T09:14:44Z', type: 'learning',       module: 'learner',      message: 'Outcome recorded: ROAS lift +0.14x on camp_meta_05 (p=0.03)',          severity: 'success' },
];

// ─── Inject incident types ────────────────────────────────────────────────────

const INJECT_TYPES = [
  { id: 'creative_fatigue', label: 'Creative Fatigue',  desc: 'Simulates CTR decay on a fatigued ad set.' },
  { id: 'stockout',         label: 'Stockout',          desc: 'Triggers inventory-zero on a SKU.' },
  { id: 'tracking_break',   label: 'Tracking Break',    desc: 'Introduces a 40% CVR tracking gap.' },
  { id: 'margin_squeeze',   label: 'Margin Squeeze',    desc: 'Increases COGS by 12% on a product line.' },
];

// ─── Severity config ──────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<Incident['severity'], { color: string; bg: string; label: string }> = {
  low:      { color: '#000000', bg: '#78dbf6', label: 'LOW' },
  medium:   { color: '#000000', bg: '#ffd23f', label: 'MED' },
  high:     { color: '#000000', bg: '#f364cb', label: 'HIGH' },
  critical: { color: '#000000', bg: '#f364cb', label: 'CRIT' },
};

const STATUS_CONFIG: Record<Incident['status'], { statusType: 'safe' | 'warning' | 'danger' | 'info' | 'neutral'; label: string }> = {
  open:          { statusType: 'warning', label: 'Open' },
  investigating: { statusType: 'info',    label: 'Investigating' },
  diagnosed:     { statusType: 'danger',  label: 'Diagnosed' },
  resolved:      { statusType: 'safe',    label: 'Resolved' },
};

interface MissionControlProps {
  onNavigateToDiagnosis?: () => void;
}

// ─── MissionControl page ──────────────────────────────────────────────────────

export const MissionControl: React.FC<MissionControlProps> = ({ onNavigateToDiagnosis }) => {
  const navigate = useNavigate();
  // TODO: wire to global Zustand store in Phase 3 (Naren's store/)
  const [activeIncidents, setActiveIncidents] = useState<Incident[]>(MOCK_INCIDENTS);
  const [liveEvents, setLiveEvents] = useState<SSEEvent[]>(MOCK_SSE_EVENTS);
  const [sseIndex, setSseIndex] = useState<number>(0);

  // Shared simulation state from context
  const { appState, toggleAutonomy } = useAppState();
  const isAutopilot = appState.autonomy_level === 'autopilot';

  // Inject modal state
  const [showInjectModal, setShowInjectModal] = useState<boolean>(false);
  const [selectedIncidentType, setSelectedIncidentType] = useState<string>('creative_fatigue');

  // Incident detail modal state
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  // Simulation duration state
  const [simDuration, setSimDuration] = useState<number>(14);

  // TODO: replace with real EventSource in Checkpoint 2
  useEffect(() => {
    const interval = setInterval(() => {
      setSseIndex((prev) => {
        const nextIdx = (prev + 1) % MOCK_SSE_EVENTS.length;
        const baseEvent = MOCK_SSE_EVENTS[nextIdx];
        const freshEvent: SSEEvent = {
          ...baseEvent,
          ts: new Date().toISOString(),
        };
        setLiveEvents((prevEvents) => [freshEvent, ...prevEvents].slice(0, 8));
        return nextIdx;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  // Escape key closes inject modal & incident detail modal
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowInjectModal(false);
        setSelectedIncident(null);
      }
    };
    if (showInjectModal || selectedIncident) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showInjectModal, selectedIncident]);

  const handleInjectIncident = useCallback(() => {
    const nowIso = new Date().toISOString();

    let newIncident: Incident;
    let newEvent: SSEEvent;

    switch (selectedIncidentType) {
      case 'stockout':
        newIncident = {
          id: 'INC-SYN',
          metric: 'CVR',
          scope: 'sku_SKU-042',
          direction: 'down',
          magnitude_pct: -100.0,
          confidence: 0.99,
          severity: 'critical',
          status: 'open',
        };
        break;
      case 'tracking_break':
        newIncident = {
          id: 'INC-SYN',
          metric: 'CVR',
          scope: 'camp_google_07',
          direction: 'down',
          magnitude_pct: -40.0,
          confidence: 0.99,
          severity: 'high',
          status: 'open',
        };
        break;
      case 'margin_squeeze':
        newIncident = {
          id: 'INC-SYN',
          metric: 'Margin',
          scope: 'sku_SKU-018',
          direction: 'down',
          magnitude_pct: -12.0,
          confidence: 0.99,
          severity: 'medium',
          status: 'open',
        };
        break;
      case 'creative_fatigue':
      default:
        newIncident = {
          id: 'INC-SYN',
          metric: 'CTR',
          scope: 'camp_meta_03',
          direction: 'down',
          magnitude_pct: -32.4,
          confidence: 0.99,
          severity: 'high',
          status: 'open',
        };
        break;
    }

    newEvent = {
      ts: nowIso,
      type: 'detection',
      module: 'sentinel',
      message: `Synthetic Injection: ${selectedIncidentType.replace('_', ' ')} detected.`,
      severity: 'danger',
    };

    setActiveIncidents((prev) => [newIncident, ...prev]);
    setLiveEvents((prev) => [newEvent, ...prev].slice(0, 8));

    // Optional API call fallback
    fetch('/api/sim/inject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: selectedIncidentType }),
    }).catch(() => {});

    setShowInjectModal(false);
  }, [selectedIncidentType]);

  const handlePlaySimulation = useCallback(() => {
    // TODO: wire to simulation play in Checkpoint 2
    console.log(`[MissionControl] Play ${simDuration}-day simulation`);
  }, [simDuration]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        width: '100%',
        boxSizing: 'border-box',
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
      }}
      aria-label="Mission Control Dashboard"
    >
      {/* ── Page heading ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
              color: '#000000',
              margin: 0,
            }}
          >
            Mission Control
          </h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#4a4a46', fontWeight: 600 }}>
            SIM DATE:{' '}
            <span style={{ fontFamily: "'Space Grotesk', monospace", color: '#000000', backgroundColor: '#78dbf6', padding: '0.1rem 0.4rem', border: '2px solid #000' }}>
              {MOCK_APP_STATE.sim_date}
            </span>
            {' '}·{' '}REAL-TIME AD OPERATIONS COMMAND CENTER
          </p>
        </div>
        <StatusBadge status={isAutopilot ? 'safe' : 'warning'} pulse>
          {isAutopilot ? 'Autopilot Mode' : 'Supervised Mode'}
        </StatusBadge>
      </div>

      {/* ── Row 1: 4-up KPI Cards ───────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1.5rem',
        }}
      >
        {MOCK_APP_STATE.kpis.map((kpi) => (
          <KPICard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            unit={kpi.unit}
            deltaPct={kpi.delta_pct}
            sparklineData={kpi.sparkline}
          />
        ))}
      </div>

      {/* ── Row 2: Autonomy | Risk Gauge | Active Incidents ─────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        {/* Autonomy Card */}
        <Card title="Autonomy Level">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <StatusBadge status={isAutopilot ? 'safe' : 'warning'} pulse>
                {isAutopilot ? 'Autopilot' : 'Supervised'}
              </StatusBadge>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#4a4a46', textTransform: 'uppercase' }}>
                Active Mode
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#000000', lineHeight: 1.55, fontWeight: 500 }}>
              {isAutopilot ? (
                <>
                  In <strong style={{ backgroundColor: '#82e66f', padding: '0 4px', border: '1px solid #000' }}>Autopilot</strong> mode, the
                  agent executes approved action classes automatically within risk budget. Switch to{' '}
                  <strong style={{ backgroundColor: '#ffd23f', padding: '0 4px', border: '1px solid #000' }}>Supervised</strong> to require
                  human approval before execution.
                </>
              ) : (
                <>
                  In <strong style={{ backgroundColor: '#ffd23f', padding: '0 4px', border: '1px solid #000' }}>Supervised</strong> mode, all
                  recommendations require human approval before execution. Switch to{' '}
                  <strong style={{ backgroundColor: '#82e66f', padding: '0 4px', border: '1px solid #000' }}>Autopilot</strong> to let the
                  agent execute approved action classes automatically within risk budget.
                </>
              )}
            </p>
            <Button variant={isAutopilot ? 'secondary' : 'primary'} size="sm" onClick={toggleAutonomy}>
              {isAutopilot ? 'Switch to Supervised' : 'Switch to Autopilot'}
            </Button>
          </div>
        </Card>

        {/* Risk Budget Card */}
        <Card title="Daily Risk Budget">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <RiskGauge
              usedPct={MOCK_APP_STATE.risk_budget.used_pct}
              capPct={MOCK_APP_STATE.risk_budget.cap_pct}
              size={170}
              label="Spend at Risk"
            />
            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#4a4a46', textAlign: 'center', textTransform: 'uppercase' }}>
              Daily budget consumed safely. Cap resets at 00:00 UTC.
            </p>
          </div>
        </Card>

        {/* Active Incidents Card */}
        <Card
          title="Active Incidents"
          action={
            <Badge variant="warning" style={{ fontSize: '0.6875rem' }}>
              {activeIncidents.filter((i) => i.status !== 'resolved').length} OPEN
            </Badge>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {activeIncidents.map((inc) => {
              const sev = SEVERITY_CONFIG[inc.severity];
              const statusCfg = STATUS_CONFIG[inc.status];
              const dirSign = inc.direction === 'up' ? '+' : '';

              return (
                <div
                  key={inc.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedIncident(inc)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedIncident(inc);
                    }
                  }}
                  className="cursor-pointer brutal-card-hover"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '10px auto 1fr auto auto',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.625rem',
                    borderRadius: '0px',
                    backgroundColor: '#ffffff',
                    border: '2px solid #000000',
                    boxShadow: '3px 3px 0px #000000',
                    color: '#000000',
                    transition: 'all 100ms ease',
                  }}
                  aria-label={`Incident ${inc.id}: ${inc.metric} ${inc.scope} ${dirSign}${inc.magnitude_pct.toFixed(1)}%`}
                >
                  {/* Severity square */}
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      backgroundColor: sev.bg,
                      border: '1.5px solid #000000',
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  />

                  {/* Severity label */}
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      fontFamily: "'Space Grotesk', monospace",
                      color: '#000000',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {sev.label}
                  </span>

                  {/* Metric + Scope */}
                  <span style={{ fontSize: '0.8125rem' }}>
                    <span style={{ fontWeight: 700, color: '#000000' }}>{inc.metric}</span>
                    <span style={{ color: '#4a4a46', marginLeft: '0.35rem', fontSize: '0.75rem', fontFamily: "'Space Grotesk', monospace", fontWeight: 600 }}>
                      {inc.scope}
                    </span>
                  </span>

                  {/* Magnitude pill */}
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      fontFamily: "'Space Grotesk', monospace",
                      color: '#000000',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '0px',
                      border: '1.5px solid #000000',
                      backgroundColor: inc.direction === 'down' ? '#f364cb' : '#82e66f',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {dirSign}{inc.magnitude_pct.toFixed(1)}%
                  </span>

                  {/* Chevron */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ── Row 3: Live Agent Stream | Quick Demo Controls ───────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        {/* Agent Feed */}
        <Card
          title="Live Agent Stream"
          action={
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '0px',
                  backgroundColor: '#82e66f',
                  border: '1px solid #000000',
                  animation: 'status-pulse 1.4s ease-in-out infinite',
                  display: 'inline-block',
                }}
                aria-hidden="true"
              />
              <span style={{ fontSize: '0.6875rem', color: '#000000', fontFamily: "'Space Grotesk', monospace", fontWeight: 700, letterSpacing: '0.04em' }}>
                LIVE
              </span>
            </div>
          }
        >
          <AgentFeed events={liveEvents} maxVisible={8} />
        </Card>

        {/* Quick Demo Controls */}
        <Card title="Quick Demo Controls">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.8125rem', color: '#4a4a46', lineHeight: 1.5, fontWeight: 600 }}>
                Inject a synthetic incident event into the simulation to observe the full agent pipeline response.
              </p>
              <Button
                variant="primary"
                size="sm"
                style={{ width: '100%' }}
                onClick={() => setShowInjectModal(true)}
              >
                Inject Incident
              </Button>
            </div>

            <div
              style={{
                height: '3px',
                backgroundColor: '#000000',
              }}
            />

            <div>
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.8125rem', color: '#4a4a46', lineHeight: 1.5, fontWeight: 600 }}>
                Fast-forward through {simDuration} simulation days and observe KPI trajectories and agent decisions.
              </p>

              <div className="flex items-center gap-2 mb-4 bg-white p-1 border-2 border-black">
                {[7, 14, 30].map((days) => (
                  <button
                    key={days}
                    onClick={() => setSimDuration(days)}
                    className={`flex-1 text-xs font-bold py-1.5 transition-colors brutal-btn ${
                      simDuration === days 
                        ? 'bg-[#ffd23f] text-black border-2 border-black shadow-[2px_2px_0px_#000]' 
                        : 'bg-white text-black hover:bg-[#e1e1d8] border border-black'
                    }`}
                  >
                    {days} Days
                  </button>
                ))}
              </div>

              <Button
                variant="secondary"
                size="sm"
                style={{ width: '100%', backgroundColor: '#82e66f' }}
                onClick={handlePlaySimulation}
              >
                Play {simDuration}-Day Simulation
              </Button>
            </div>

            <div
              style={{
                padding: '0.625rem',
                borderRadius: '0px',
                backgroundColor: '#ffd23f',
                border: '2px solid #000000',
                boxShadow: '3px 3px 0px #000000',
                fontSize: '0.75rem',
                color: '#000000',
                lineHeight: 1.5,
                fontFamily: "'Space Grotesk', monospace",
                fontWeight: 600,
              }}
            >
              <span style={{ color: '#000000', fontWeight: 700 }}>NOTE:</span>{' '}
              Controls are simulation-only. Real budget execution requires Autopilot mode + guardian sign-off.
            </div>
          </div>
        </Card>
      </div>

      {/* ── Inject Incident Modal ────────────────────────────────────────── */}
      {showInjectModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="inject-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowInjectModal(false); }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '3px solid #000000',
              boxShadow: '8px 8px 0px #000000',
              borderRadius: '0px',
              padding: '1.75rem',
              maxWidth: '440px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            <h2
              id="inject-modal-title"
              style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, textTransform: 'uppercase', color: '#000000' }}
            >
              Inject Synthetic Incident
            </h2>

            <p style={{ margin: 0, fontSize: '0.875rem', color: '#4a4a46', lineHeight: 1.5, fontWeight: 600 }}>
              Choose an incident type to inject into the simulation. The agent pipeline will detect and respond automatically.
            </p>

            {/* Incident type selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {INJECT_TYPES.map((t) => (
                <label
                  key={t.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    borderRadius: '0px',
                    cursor: 'pointer',
                    backgroundColor: selectedIncidentType === t.id ? '#78dbf6' : '#ffffff',
                    border: '2px solid #000000',
                    boxShadow: selectedIncidentType === t.id ? '3px 3px 0px #000000' : 'none',
                    transition: 'all 100ms ease',
                  }}
                >
                  <input
                    type="radio"
                    name="injectType"
                    value={t.id}
                    checked={selectedIncidentType === t.id}
                    onChange={() => setSelectedIncidentType(t.id)}
                    style={{ marginTop: '3px', accentColor: '#000000' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#000000', textTransform: 'uppercase' }}>
                      {t.label}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#000000', marginTop: '0.15rem', fontWeight: 500 }}>
                      {t.desc}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="ghost" size="sm" onClick={() => setShowInjectModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" style={{ backgroundColor: '#82e66f' }} onClick={handleInjectIncident} autoFocus>
                Confirm — Inject
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Incident Detail Modal ────────────────────────────────────────── */}
      {selectedIncident && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="incident-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedIncident(null); }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '3px solid #000000',
              boxShadow: '8px 8px 0px #000000',
              borderRadius: '0px',
              padding: '1.75rem',
              maxWidth: '480px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    fontFamily: "'Space Grotesk', monospace",
                    color: '#000000',
                    backgroundColor: SEVERITY_CONFIG[selectedIncident.severity].bg,
                    padding: '0.2rem 0.5rem',
                    border: '2px solid #000000',
                  }}
                >
                  {SEVERITY_CONFIG[selectedIncident.severity].label}
                </span>
                <h2
                  id="incident-modal-title"
                  style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#000000', fontFamily: "'Space Grotesk', monospace" }}
                >
                  {selectedIncident.id}
                </h2>
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                style={{
                  background: 'none',
                  border: '2px solid #000000',
                  color: '#000000',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                  padding: '0.1rem 0.4rem',
                  fontSize: '1rem',
                  fontWeight: 700,
                  lineHeight: 1,
                  boxShadow: '2px 2px 0px #000000',
                }}
                aria-label="Close detail modal"
              >
                ✕
              </button>
            </div>

            {/* Description One-Liner */}
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#000000', lineHeight: 1.5, fontWeight: 600 }}>
              {selectedIncident.metric === 'CTR' && 'Click-through rate anomaly detected on this campaign.'}
              {selectedIncident.metric === 'ROAS' && 'Return on ad spend has shifted beyond expected bounds.'}
              {selectedIncident.metric === 'CVR' && 'Conversion rate collapse — possible stockout or tracking issue.'}
              {selectedIncident.metric === 'CPM' && 'Cost per thousand impressions spike detected.'}
              {selectedIncident.metric === 'Margin' && 'Unit margin compression detected on this SKU.'}
              {!['CTR', 'ROAS', 'CVR', 'CPM', 'Margin'].includes(selectedIncident.metric) && 'Synthetic performance anomaly detected by Sentinel.'}
            </p>

            {/* Fields Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.875rem',
                backgroundColor: '#f3f3ed',
                padding: '1rem',
                borderRadius: '0px',
                border: '2px solid #000000',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: '#4a4a46', marginBottom: '0.2rem', fontWeight: 700, textTransform: 'uppercase' }}>Metric</div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#000000' }}>{selectedIncident.metric}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#4a4a46', marginBottom: '0.2rem', fontWeight: 700, textTransform: 'uppercase' }}>Scope</div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#000000', fontFamily: "'Space Grotesk', monospace" }}>{selectedIncident.scope}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#4a4a46', marginBottom: '0.2rem', fontWeight: 700, textTransform: 'uppercase' }}>Direction / Magnitude</div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    color: '#000000',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <span style={{ backgroundColor: selectedIncident.direction === 'down' ? '#f364cb' : '#82e66f', padding: '0 4px', border: '1px solid #000' }}>
                    {selectedIncident.direction === 'up' ? '▲ +' : '▼ '}{selectedIncident.magnitude_pct.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#4a4a46', marginBottom: '0.2rem', fontWeight: 700, textTransform: 'uppercase' }}>Confidence</div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#000000', fontFamily: "'Space Grotesk', monospace" }}>
                  {Math.round(selectedIncident.confidence * 100)}%
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#4a4a46', marginBottom: '0.2rem', fontWeight: 700, textTransform: 'uppercase' }}>Severity</div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#000000', textTransform: 'capitalize' }}>
                  {selectedIncident.severity}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#4a4a46', marginBottom: '0.2rem', fontWeight: 700, textTransform: 'uppercase' }}>Status</div>
                <div>
                  <StatusBadge status={STATUS_CONFIG[selectedIncident.status].statusType}>
                    {STATUS_CONFIG[selectedIncident.status].label}
                  </StatusBadge>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIncident(null)}>
                Dismiss
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (selectedIncident) {
                    const newEvent: SSEEvent = {
                      ts: new Date().toISOString(),
                      type: 'investigation',
                      module: 'investigator',
                      message: `Opening deep-dive diagnosis for ${selectedIncident.id} (${selectedIncident.scope})`,
                      severity: 'info',
                    };
                    setLiveEvents((prev) => [newEvent, ...prev].slice(0, 8));
                  }
                  setSelectedIncident(null);
                  if (onNavigateToDiagnosis) {
                    onNavigateToDiagnosis();
                  } else {
                    navigate('/diagnosis');
                  }
                }}
              >
                View Full Diagnosis →
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MissionControl;
