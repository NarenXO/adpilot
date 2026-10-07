import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { KPICard } from '../components/ui/KPICard';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Badge } from '../components/ui/Badge';
import { RiskGauge } from '../components/ui/RiskGauge';
import { AgentFeed } from '../components/ui/AgentFeed';
import type { SSEEvent } from '../components/ui/AgentFeed';

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

const SEVERITY_CONFIG: Record<Incident['severity'], { color: string; label: string }> = {
  low:      { color: '#38bdf8', label: 'LOW' },
  medium:   { color: '#f59e0b', label: 'MED' },
  high:     { color: '#ef4444', label: 'HIGH' },
  critical: { color: '#ff2c2c', label: 'CRIT' },
};

const STATUS_CONFIG: Record<Incident['status'], { statusType: 'safe' | 'warning' | 'danger' | 'info' | 'neutral'; label: string }> = {
  open:          { statusType: 'warning', label: 'Open' },
  investigating: { statusType: 'info',    label: 'Investigating' },
  diagnosed:     { statusType: 'danger',  label: 'Diagnosed' },
  resolved:      { statusType: 'safe',    label: 'Resolved' },
};

// ─── MissionControl page ──────────────────────────────────────────────────────

export const MissionControl: React.FC = () => {
  // TODO: wire to global Zustand store in Phase 3 (Naren's store/)
  const [incidents, setIncidents] = useState<Incident[]>([...MOCK_INCIDENTS]);
  const [events, setEvents] = useState<SSEEvent[]>([...MOCK_SSE_EVENTS]);
  const [sseIndex, setSseIndex] = useState<number>(0);

  // Inject modal state
  const [showInjectModal, setShowInjectModal] = useState<boolean>(false);
  const [selectedInjectType, setSelectedInjectType] = useState<string>('creative_fatigue');

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
        setEvents((prevEvents) => [freshEvent, ...prevEvents].slice(0, 8));
        return nextIdx;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  // Escape key closes inject modal
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowInjectModal(false);
    };
    if (showInjectModal) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showInjectModal]);

  const handleConfirmInject = useCallback(() => {
    const randomId = 'INC-' + Math.floor(100 + Math.random() * 900);
    const nowIso = new Date().toISOString();

    let newIncident: Incident;
    let newEvent: SSEEvent;

    switch (selectedInjectType) {
      case 'stockout':
        newIncident = {
          id: randomId,
          metric: 'CVR',
          scope: 'sku_SKU-042',
          direction: 'down',
          magnitude_pct: -100.0,
          confidence: 0.98,
          severity: 'critical',
          status: 'investigating',
        };
        newEvent = {
          ts: nowIso,
          type: 'detection',
          module: 'sentinel',
          message: 'Synthetic trigger: Stockout injected on SKU-042 (0 units remaining)',
          severity: 'danger',
        };
        break;

      case 'tracking_break':
        newIncident = {
          id: randomId,
          metric: 'CVR',
          scope: 'camp_google_07',
          direction: 'down',
          magnitude_pct: -40.0,
          confidence: 0.89,
          severity: 'high',
          status: 'investigating',
        };
        newEvent = {
          ts: nowIso,
          type: 'detection',
          module: 'sentinel',
          message: 'Synthetic trigger: Tracking break injected on camp_google_07 (-40% gap)',
          severity: 'warning',
        };
        break;

      case 'margin_squeeze':
        newIncident = {
          id: randomId,
          metric: 'Margin',
          scope: 'sku_SKU-018',
          direction: 'down',
          magnitude_pct: -12.0,
          confidence: 0.85,
          severity: 'medium',
          status: 'investigating',
        };
        newEvent = {
          ts: nowIso,
          type: 'detection',
          module: 'sentinel',
          message: 'Synthetic trigger: Margin squeeze injected on SKU-018 (+12% COGS)',
          severity: 'warning',
        };
        break;

      case 'creative_fatigue':
      default:
        newIncident = {
          id: randomId,
          metric: 'CTR',
          scope: 'camp_meta_03',
          direction: 'down',
          magnitude_pct: -32.4,
          confidence: 0.91,
          severity: 'high',
          status: 'investigating',
        };
        newEvent = {
          ts: nowIso,
          type: 'detection',
          module: 'sentinel',
          message: 'Synthetic trigger: CTR anomaly injected on camp_meta_03 (-32.4%)',
          severity: 'warning',
        };
        break;
    }

    // Prepend new incident to state
    setIncidents((prev) => [newIncident, ...prev]);

    // Push new event to top of agent feed
    setEvents((prev) => [newEvent, ...prev].slice(0, 8));

    // Try real API, fallback to local mock state
    fetch('/api/sim/inject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: selectedInjectType }),
    }).catch(() => {});

    setShowInjectModal(false);
  }, [selectedInjectType]);

  const handlePlay14Day = useCallback(() => {
    // TODO: wire to simulation play in Checkpoint 2
    console.log('[MissionControl] Play 14-day simulation');
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        width: '100%',
        boxSizing: 'border-box',
      }}
      aria-label="Mission Control Dashboard"
    >
      {/* ── Page heading ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1
            style={{
              fontSize: '1.375rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary, #f8fafc)',
              margin: 0,
            }}
          >
            Mission Control
          </h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary, #94a3b8)' }}>
            SIM DATE:{' '}
            <span style={{ fontFamily: 'var(--font-mono, monospace)', color: 'var(--accent-cyan, #38bdf8)' }}>
              {MOCK_APP_STATE.sim_date}
            </span>
            {' '}·{' '}Real-time ad operations command center
          </p>
        </div>
        <StatusBadge status="warning" pulse>
          Supervised Mode
        </StatusBadge>
      </div>

      {/* ── Row 1: 4-up KPI Cards ───────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1rem',
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
          gap: '1rem',
          alignItems: 'start',
        }}
      >
        {/* Autonomy Card */}
        <Card title="Autonomy Mode">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <StatusBadge status="warning" pulse>
                Supervised
              </StatusBadge>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary, #94a3b8)' }}>
                Active mode
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary, #94a3b8)', lineHeight: 1.55 }}>
              In <strong style={{ color: 'var(--accent-amber, #f59e0b)' }}>Supervised</strong> mode, all
              recommendations require human approval before execution. Switch to{' '}
              <strong style={{ color: 'var(--accent-neon-green, #10b981)' }}>Autopilot</strong> to let the
              agent execute approved action classes automatically within risk budget.
            </p>
            <Button variant="secondary" size="sm">
              Switch to Autopilot
            </Button>
          </div>
        </Card>

        {/* Risk Budget Card */}
        <Card title="Daily Risk Budget">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <RiskGauge
              usedPct={MOCK_APP_STATE.risk_budget.used_pct}
              capPct={MOCK_APP_STATE.risk_budget.cap_pct}
              size={170}
              label="Spend at Risk"
            />
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', textAlign: 'center' }}>
              Daily budget consumed safely. Cap resets at 00:00 UTC.
            </p>
          </div>
        </Card>

        {/* Active Incidents Card */}
        <Card
          title="Active Incidents"
          action={
            <Badge variant="warning" style={{ fontSize: '0.625rem' }}>
              {incidents.filter((i) => i.status !== 'resolved').length} open
            </Badge>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {incidents.map((inc) => {
              const sev = SEVERITY_CONFIG[inc.severity];
              const statusCfg = STATUS_CONFIG[inc.status];
              const dirSign = inc.direction === 'up' ? '+' : '';

              return (
                <a
                  key={inc.id}
                  href="/incidents"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '8px auto 1fr auto auto',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--card-border, #1e293b)',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'all var(--transition-fast, 150ms ease)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.065)';
                    e.currentTarget.style.borderColor = 'var(--card-border-hover, #334155)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
                    e.currentTarget.style.borderColor = 'var(--card-border, #1e293b)';
                  }}
                  aria-label={`Incident ${inc.id}: ${inc.metric} ${inc.scope} ${dirSign}${inc.magnitude_pct.toFixed(1)}%`}
                >
                  {/* Severity dot */}
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: sev.color,
                      boxShadow: `0 0 5px ${sev.color}`,
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  />

                  {/* Severity label */}
                  <span
                    style={{
                      fontSize: '0.625rem',
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono, monospace)',
                      color: sev.color,
                      letterSpacing: '0.04em',
                    }}
                  >
                    {sev.label}
                  </span>

                  {/* Metric + Scope */}
                  <span style={{ fontSize: '0.8125rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>{inc.metric}</span>
                    <span style={{ color: 'var(--text-muted, #64748b)', marginLeft: '0.35rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono, monospace)' }}>
                      {inc.scope}
                    </span>
                  </span>

                  {/* Magnitude pill */}
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono, monospace)',
                      color: inc.direction === 'down' ? 'var(--accent-red, #ef4444)' : 'var(--accent-neon-green, #10b981)',
                      padding: '0.1rem 0.35rem',
                      borderRadius: '0.25rem',
                      backgroundColor: inc.direction === 'down' ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {dirSign}{inc.magnitude_pct.toFixed(1)}%
                  </span>

                  {/* Chevron */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted, #64748b)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </a>
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
          gap: '1rem',
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
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-neon-green, #10b981)',
                  boxShadow: '0 0 6px var(--accent-neon-green, #10b981)',
                  animation: 'status-pulse 1.8s ease-in-out infinite',
                  display: 'inline-block',
                }}
                aria-hidden="true"
              />
              <span style={{ fontSize: '0.6875rem', color: 'var(--accent-neon-green, #10b981)', fontFamily: 'var(--font-mono, monospace)', fontWeight: 600, letterSpacing: '0.04em' }}>
                LIVE
              </span>
            </div>
          }
        >
          <AgentFeed events={events} maxVisible={8} />
        </Card>

        {/* Quick Demo Controls */}
        <Card title="Quick Demo Controls">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.8125rem', color: 'var(--text-secondary, #94a3b8)', lineHeight: 1.5 }}>
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
                height: '1px',
                backgroundColor: 'var(--card-border, #1e293b)',
              }}
            />

            <div>
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.8125rem', color: 'var(--text-secondary, #94a3b8)', lineHeight: 1.5 }}>
                Fast-forward through 14 simulation days and observe KPI trajectories and agent decisions.
              </p>
              <Button
                variant="secondary"
                size="sm"
                style={{ width: '100%' }}
                onClick={handlePlay14Day}
              >
                Play 14-Day Simulation
              </Button>
            </div>

            <div
              style={{
                padding: '0.625rem',
                borderRadius: '0.5rem',
                backgroundColor: 'rgba(56, 189, 248, 0.06)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                fontSize: '0.75rem',
                color: 'var(--text-muted, #64748b)',
                lineHeight: 1.5,
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              <span style={{ color: 'var(--accent-cyan, #38bdf8)', fontWeight: 600 }}>NOTE</span>{' '}
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
            backgroundColor: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
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
              backgroundColor: 'var(--card-glass-elevated, rgba(30, 41, 59, 0.95))',
              border: '1px solid var(--card-border-hover, #334155)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              borderRadius: 'var(--radius-xl, 0.875rem)',
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
              style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}
            >
              Inject Synthetic Incident
            </h2>

            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary, #94a3b8)', lineHeight: 1.5 }}>
              Choose an incident type to inject into the simulation. The agent pipeline will detect and respond automatically.
            </p>

            {/* Incident type selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {INJECT_TYPES.map((t) => (
                <label
                  key={t.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.625rem 0.75rem',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    backgroundColor: selectedInjectType === t.id ? 'rgba(56,189,248,0.1)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${selectedInjectType === t.id ? 'rgba(56,189,248,0.35)' : 'var(--card-border, #1e293b)'}`,
                    transition: 'all var(--transition-fast, 150ms ease)',
                  }}
                >
                  <input
                    type="radio"
                    name="injectType"
                    value={t.id}
                    checked={selectedInjectType === t.id}
                    onChange={() => setSelectedInjectType(t.id)}
                    style={{ marginTop: '2px', accentColor: 'var(--accent-cyan, #38bdf8)' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary, #f8fafc)' }}>
                      {t.label}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', marginTop: '0.15rem' }}>
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
              <Button variant="primary" size="sm" onClick={handleConfirmInject} autoFocus>
                Confirm — Inject
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MissionControl;
