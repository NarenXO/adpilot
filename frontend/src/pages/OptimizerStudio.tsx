import React, { useState, useCallback, useMemo, Component, type ErrorInfo, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ResponseCurve } from '../components/charts/ResponseCurve';
import { SankeyChart } from '../components/charts/SankeyChart';

if (typeof window !== 'undefined') {
  window.addEventListener('error', e => console.error('[OPT]', (e as any).error ?? e.message));
  window.addEventListener('unhandledrejection', e => console.error('[OPT-REJECT]', (e as any).reason));
}

// ─── Exact Neo-Brutalist design tokens preserved ─────────────────────────
const T = {
  bg: '#f3f3ed',
  gridLine: '#e1e1d8',
  card: '#ffffff',
  border: '3px solid #000000',
  borderThin: '2px solid #000000',
  shadow: '4px 4px 0px #000000',
  shadowSm: '3px 3px 0px #000000',
  radius: '10px',
  lime: '#82e66f',
  pink: '#f364cb',
  cyan: '#78dbf6',
  yellow: '#ffd23f',
  black: '#000000',
  white: '#ffffff',
  textPrimary: '#000000',
  textSecondary: '#333333',
  textSubtle: '#666666',
  textMuted: '#4a4a4a',
  fontSans: "'Space Grotesk', sans-serif",
  fontMono: "'Space Grotesk', monospace",
};

class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('OptimizerStudio caught component error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{ padding: 20, background: '#fff', border: '3px solid #000', margin: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: '#ff4466', marginBottom: 8 }}>COMPONENT RENDER ERROR</div>
          <pre style={{ margin: 0, padding: 12, background: '#f8f8f8', border: '1.5px solid #000', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11, fontFamily: T.fontMono }}>
            {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

interface OpportunityScore {
  sim_date: string; campaign_id: string; sku: string;
  forecast_component: number; curve_component: number;
  margin_component: number; stock_component: number; total_score: number;
}
interface RecommendationChange { campaign_id: string; from_spend: number; to_spend: number; }
interface Recommendation {
  id: string; incident_id: string; mode: string;
  changes: RecommendationChange[];
  expected_profit_delta: { low: number; mid: number; high: number };
  constraints_binding: string[]; confidence: number;
  opportunity_scores: OpportunityScore[];
}
interface CurvePoint { spend: number; revenue_low: number; revenue_mid: number; revenue_high: number; }
interface CurveData {
  campaign_id: string; sku: string; data_points: CurvePoint[];
  current_spend: number; recommended_spend: number; opportunity_score: number;
}
interface ActionItem {
  id: string; recommendation_id: string;
  status: 'pending' | 'rolling_out' | 'approved' | 'rolled_back' | 'rejected';
  rollout_pct: number; rollback_guard: { metric: string; threshold: number; window_days: number };
  changes: RecommendationChange[]; created_at: string;
}

// FORMAT HELPER
const formatINR = (num: number) => `₹${Math.round(num).toLocaleString('en-IN')}`;

// FIXTURES SCALED TO INR AND RENAMED TO READABLE TEXT
const CURVE_FIXTURE: CurveData[] = [
  {
    campaign_id: 'Meta Summer Promo', sku: 'Wireless Earbuds',
    data_points: [
      { spend: 5000, revenue_low: 20000, revenue_mid: 24000, revenue_high: 27500 },
      { spend: 10000, revenue_low: 38000, revenue_mid: 42000, revenue_high: 46000 },
      { spend: 15000, revenue_low: 54000, revenue_mid: 59000, revenue_high: 64500 },
      { spend: 20000, revenue_low: 70000, revenue_mid: 78000, revenue_high: 86000 },
      { spend: 27500, revenue_low: 87000, revenue_mid: 97000, revenue_high: 107000 },
      { spend: 32500, revenue_low: 94000, revenue_mid: 106000, revenue_high: 117500 },
      { spend: 40000, revenue_low: 99000, revenue_mid: 112000, revenue_high: 125000 },
      { spend: 50000, revenue_low: 102000, revenue_mid: 116500, revenue_high: 130500 },
      { spend: 65000, revenue_low: 104000, revenue_mid: 119000, revenue_high: 134000 },
    ], current_spend: 50000, recommended_spend: 32500, opportunity_score: 32
  },
  {
    campaign_id: 'Meta Retargeting', sku: 'Smart Watches',
    data_points: [
      { spend: 5000, revenue_low: 28000, revenue_mid: 31000, revenue_high: 34500 },
      { spend: 10000, revenue_low: 52000, revenue_mid: 58000, revenue_high: 64000 },
      { spend: 20000, revenue_low: 94000, revenue_mid: 106000, revenue_high: 118000 },
      { spend: 30000, revenue_low: 128000, revenue_mid: 145000, revenue_high: 161000 },
      { spend: 40000, revenue_low: 154000, revenue_mid: 176000, revenue_high: 197000 },
      { spend: 47500, revenue_low: 172000, revenue_mid: 197500, revenue_high: 221500 },
      { spend: 60000, revenue_low: 191000, revenue_mid: 221000, revenue_high: 249000 },
      { spend: 75000, revenue_low: 206000, revenue_mid: 239500, revenue_high: 271000 },
    ], current_spend: 30000, recommended_spend: 47500, opportunity_score: 87
  },
  {
    campaign_id: 'Google Smart Home', sku: 'Home Hub',
    data_points: [
      { spend: 10000, revenue_low: 49000, revenue_mid: 54000, revenue_high: 59000 },
      { spend: 20000, revenue_low: 89000, revenue_mid: 98000, revenue_high: 107500 },
      { spend: 30000, revenue_low: 122000, revenue_mid: 135000, revenue_high: 149000 },
      { spend: 40000, revenue_low: 148000, revenue_mid: 165000, revenue_high: 183000 },
      { spend: 50000, revenue_low: 168000, revenue_mid: 189000, revenue_high: 210500 },
      { spend: 60000, revenue_low: 184000, revenue_mid: 207500, revenue_high: 231500 },
    ], current_spend: 30000, recommended_spend: 40000, opportunity_score: 74
  },
];

const RECS_FIXTURE: Recommendation[] = [
  {
    id: 'REC-001', incident_id: 'INC-001', mode: 'profit',
    changes: [{ campaign_id: 'Meta Summer Promo', from_spend: 50000, to_spend: 32500 }, { campaign_id: 'Meta Retargeting', from_spend: 30000, to_spend: 47500 }],
    expected_profit_delta: { low: 4500, mid: 12000, high: 21000 },
    constraints_binding: ['max_change_30pct', 'min_spend_5000'], confidence: 0.78,
    opportunity_scores: [
      { sim_date: '2024-06-15', campaign_id: 'Meta Summer Promo', sku: 'Wireless Earbuds', forecast_component: 5, curve_component: 8, margin_component: 12, stock_component: 7, total_score: 32 },
      { sim_date: '2024-06-15', campaign_id: 'Meta Retargeting', sku: 'Smart Watches', forecast_component: 22, curve_component: 21, margin_component: 24, stock_component: 20, total_score: 87 },
    ]
  },
];

const ACTIONS_FIXTURE: ActionItem[] = [
  {
    id: 'ACT-001', recommendation_id: 'REC-001', status: 'rolling_out', rollout_pct: 50,
    rollback_guard: { metric: 'roas', threshold: 3.0, window_days: 2 },
    changes: [{ campaign_id: 'Meta Summer Promo', from_spend: 50000, to_spend: 32500 }], created_at: '2024-06-15T10:30:00Z'
  },
  {
    id: 'ACT-002', recommendation_id: 'REC-002', status: 'pending', rollout_pct: 0,
    rollback_guard: { metric: 'roas', threshold: 2.5, window_days: 3 },
    changes: [{ campaign_id: 'Google Smart Home', from_spend: 30000, to_spend: 40000 }], created_at: '2024-06-15T11:00:00Z'
  },
];

const API_BASE = 'http://localhost:8000/api';

async function fetchFallback<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    if (res.ok) return res.json() as Promise<T>;
  } catch { /* backend offline */ }
  return fallback;
}

async function doApprove(id: string) {
  try {
    const res = await fetch(`${API_BASE}/actions/${id}/approve`, { method: 'POST' });
    if (res.ok) return res.json();
  } catch { /**/ }
  return { action_id: id, status: 'approved', rollout_pct: 100 };
}

async function doRollback(id: string) {
  try {
    const res = await fetch(`${API_BASE}/actions/${id}/rollback`, { method: 'POST' });
    if (res.ok) return res.json();
  } catch { /**/ }
  return { action_id: id, status: 'rolled_back' };
}

function ScoreBadge({ score }: { score: number }) {
  const num = Number(score ?? 0);
  const accent = num >= 70 ? T.lime : num >= 40 ? T.yellow : T.pink;
  const label = num >= 70 ? 'HIGH' : num >= 40 ? 'MED' : 'LOW';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ background: '#ffffff', border: '2px solid #000000', borderRadius: '6px', padding: '3px 8px', fontWeight: 800, fontSize: 12, color: '#000000', boxShadow: '2px 2px 0px #000000' }}>
        {Math.round(num)}
      </div>
      <span style={{ background: accent, color: '#000000', border: '2px solid #000000', borderRadius: '4px', padding: '2px 8px', fontSize: 10, fontWeight: 800, boxShadow: '2px 2px 0px #000000' }}>{label}</span>
    </div>
  );
}

function BarRow({ label, value, color }: { label: string; value: number; color: string }) {
  const num = value ?? 0;
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 10, color: T.textMuted, fontWeight: 700 }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#000000' }}>{num.toFixed(0)}</span>
      </div>
      <div style={{ height: 8, background: '#e1e1d8', border: '1.5px solid #000000', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(100, (num / 25) * 100)}%`, background: color, transition: 'width 0.6s' }} />
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: ActionItem['status'] }) {
  const map: Record<string, { accent: string; label: string }> = {
    pending: { accent: T.yellow, label: 'REVIEW' },
    rolling_out: { accent: T.cyan, label: 'ROLLOUT' },
    approved: { accent: T.lime, label: 'AUTO' },
    rolled_back: { accent: T.pink, label: 'BLOCK' },
    rejected: { accent: T.pink, label: 'REJECTED' },
  };
  const s = map[status] ?? map['pending'];
  return <span style={{ background: s.accent, color: '#000000', border: '2px solid #000000', padding: '2px 8px', fontSize: 10, fontWeight: 800, borderRadius: '4px', boxShadow: '1.5px 1.5px 0px #000000' }}>{s.label}</span>;
}

function ActionCard({ action, onApprove, onRollback }: { action: ActionItem; onApprove: (id: string) => void; onRollback: (id: string) => void }) {
  const canApprove = action.status === 'pending' || action.status === 'rolling_out';
  const canRollback = action.status === 'rolling_out' || action.status === 'approved';
  const changes = action.changes ?? [];

  return (
    <div style={{ background: T.card, border: T.border, boxShadow: T.shadow, borderRadius: T.radius, padding: '14px 16px', marginBottom: 14, transition: 'transform 0.1s' }} onMouseEnter={e => (e.currentTarget.style.transform = 'translate(-2px,-2px)')} onMouseLeave={e => (e.currentTarget.style.transform = 'translate(0,0)')}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#000000' }}>{action.id}</span>
          <StatusPill status={action.status} />
        </div>
        <span style={{ fontSize: 10, color: T.textSubtle, fontWeight: 600 }}>Active</span>
      </div>
      {changes.map(ch => {
        const delta = Math.round(ch.to_spend - ch.from_spend);
        return (
          <div key={ch.campaign_id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, background: T.bg, border: '2px solid #000000', borderRadius: '6px', padding: '8px 12px' }}>
            <span style={{ fontSize: 11, color: '#000000', flex: 1, fontWeight: 700 }}>{ch.campaign_id}</span>
            <span style={{ fontSize: 12, color: T.pink, fontWeight: 800 }}>{formatINR(ch.from_spend)}</span>
            <span style={{ fontSize: 11, color: T.textSubtle }}>→</span>
            <span style={{ fontSize: 12, color: '#000000', fontWeight: 800 }}>{formatINR(ch.to_spend)}</span>
            <span style={{ fontSize: 10, fontWeight: 800, background: delta >= 0 ? T.lime : T.pink, color: '#000000', padding: '1px 6px', border: '1.5px solid #000000', borderRadius: '4px', boxShadow: '1px 1px 0px #000000' }}>
              {delta >= 0 ? '+' : ''}{formatINR(delta)}
            </span>
          </div>
        );
      })}
      <div style={{ display: 'flex', gap: 8 }}>
        {canApprove && <button onClick={() => onApprove(action.id)} style={{ flex: 1, padding: '7px 0', background: T.lime, border: '2px solid #000000', boxShadow: '2px 2px 0px #000000', color: '#000000', fontWeight: 700, fontSize: 11, cursor: 'pointer', borderRadius: '6px', fontFamily: T.fontSans }}>Approve ✓</button>}
        {canRollback && <button onClick={() => onRollback(action.id)} style={{ flex: 1, padding: '7px 0', background: T.pink, border: '2px solid #000000', boxShadow: '2px 2px 0px #000000', color: '#000000', fontWeight: 700, fontSize: 11, cursor: 'pointer', borderRadius: '6px', fontFamily: T.fontSans }}>Rollback ↩</button>}
      </div>
    </div>
  );
}

function WhatIfPanel({ curves }: { curves: CurveData[] }) {
  const [sliders, setSliders] = useState<Record<string, number>>(() => Object.fromEntries(curves.map(c => [c.campaign_id, c.current_spend])));
  const interpolate = useCallback((curve: CurveData, spend: number) => {
    const pts = [...curve.data_points].sort((a, b) => a.spend - b.spend);
    if (spend <= pts[0].spend) return pts[0].revenue_mid;
    if (spend >= pts[pts.length - 1].spend) return pts[pts.length - 1].revenue_mid;
    for (let i = 0; i < pts.length - 1; i++) {
      if (spend >= pts[i].spend && spend <= pts[i + 1].spend) {
        const r = (spend - pts[i].spend) / (pts[i + 1].spend - pts[i].spend);
        return pts[i].revenue_mid + r * (pts[i + 1].revenue_mid - pts[i].revenue_mid);
      }
    }
    return pts[0].revenue_mid;
  }, []);

  const curRev = useMemo(() => curves.reduce((s, c) => s + (interpolate(c, c.current_spend)), 0), [curves, interpolate]);
  const simRev = useMemo(() => curves.reduce((s, c) => s + (interpolate(c, sliders[c.campaign_id])), 0), [curves, sliders, interpolate]);
  const totSim = useMemo(() => Object.values(sliders).reduce((a, b) => a + b, 0), [sliders]);
  const totCur = useMemo(() => curves.reduce((s, c) => s + c.current_spend, 0), [curves]);

  return (
    <div>
      <div style={{ background: T.card, border: T.border, boxShadow: T.shadow, borderRadius: T.radius, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#000000', marginBottom: 16, letterSpacing: '0.06em' }}>BUDGET SLIDERS</div>
        {curves.map(curve => {
          const val = sliders[curve.campaign_id] ?? curve.current_spend;
          const max = Math.max(curve.current_spend * 1.5, 80000);
          const pct = (val / max) * 100;
          return (
            <div key={curve.campaign_id} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#000000' }}>{curve.campaign_id}</span>
                  <span style={{ fontSize: 11, color: T.textSubtle, marginLeft: 8, fontWeight: 600 }}>{curve.sku}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: T.textSubtle, fontWeight: 600 }}>was {formatINR(curve.current_spend)}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, background: val > curve.current_spend ? T.lime : val < curve.current_spend ? T.pink : T.yellow, color: '#000000', padding: '2px 8px', border: '2px solid #000000', borderRadius: '4px', boxShadow: '1.5px 1.5px 0px #000000' }}>{formatINR(val)}</span>
                </div>
              </div>
              <div style={{ position: 'relative', paddingTop: 14 }}>
                <input type="range" min={5000} max={max} step={2500} value={val} onChange={e => setSliders(prev => ({ ...prev, [curve.campaign_id]: Number(e.target.value) }))} style={{ width: '100%', height: 8, appearance: 'none', background: `linear-gradient(90deg,#000000 ${pct}%,#e1e1d8 ${pct}%)`, cursor: 'pointer', outline: 'none', border: '2px solid #000000', borderRadius: '4px' }} />
              </div>
            </div>
          );
        })}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 4, paddingTop: 16, borderTop: '2px solid #000000' }}>
          <div style={{ background: T.lime, border: T.borderThin, borderRadius: '8px', boxShadow: '2px 2px 0px #000000', padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#000000', marginBottom: 4, fontWeight: 800, letterSpacing: '0.06em' }}>SPEND DELTA</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#000000' }}>{totSim - totCur >= 0 ? '+' : ''}{formatINR(totSim - totCur)}</div>
          </div>
          <div style={{ background: T.cyan, border: T.borderThin, borderRadius: '8px', boxShadow: '2px 2px 0px #000000', padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#000000', marginBottom: 4, fontWeight: 800, letterSpacing: '0.06em' }}>REVENUE LIFT</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#000000' }}>{simRev - curRev >= 0 ? '+' : ''}{formatINR(simRev - curRev)}</div>
          </div>
          <div style={{ background: T.yellow, border: T.borderThin, borderRadius: '8px', boxShadow: '2px 2px 0px #000000', padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#000000', marginBottom: 4, fontWeight: 800, letterSpacing: '0.06em' }}>SIM ROAS</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#000000' }}>{(totSim > 0 ? simRev / totSim : 0).toFixed(2)}x</div>
          </div>
        </div>
      </div>
      <ErrorBoundary><SankeyChart changes={curves.map(c => ({ campaignId: c.campaign_id, fromSpend: c.current_spend, toSpend: sliders[c.campaign_id] ?? c.current_spend }))} height="280px" /></ErrorBoundary>
    </div>
  );
}

function OptimizerStudioContent() {
  const qc = useQueryClient();
  const [selectedRec, setSelectedRec] = useState(RECS_FIXTURE[0].id);
  const [activeTab, setActiveTab] = useState<'curves' | 'whatif'>('curves');
  const [ksActive, setKsActive] = useState(false);
  const [actions, setActions] = useState<ActionItem[]>(ACTIONS_FIXTURE);

  const currentRec = RECS_FIXTURE.find(r => r.id === selectedRec) ?? RECS_FIXTURE[0];

  return (
    <div style={{ margin: '-2rem', minHeight: 'calc(100vh - 130px)', background: T.bg, fontFamily: T.fontSans, color: T.textPrimary, padding: '24px 32px' }}>

      {/* HEADER */}
      <div style={{ background: T.card, border: T.border, boxShadow: T.shadow, borderRadius: T.radius, padding: '20px 24px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 34, height: 34, background: T.lime, border: T.borderThin, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, boxShadow: '2px 2px 0px #000' }}>⚡</div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#000000' }}>Optimizer Studio</h1>
            <span style={{ background: T.cyan, color: '#000000', border: T.borderThin, borderRadius: '4px', padding: '2px 10px', fontSize: 10, fontWeight: 800, boxShadow: '2px 2px 0px #000' }}>SLSQP Engine</span>
          </div>
          <p style={{ margin: 0, fontSize: 11, color: T.textMuted, fontWeight: 600 }}>Budget allocation optimizer · Predictive opportunity scoring · Policy-gated actions</p>
        </div>
      </div>

      {/* KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'Portfolio Spend', val: formatINR(110000), sub: '/day', accent: T.cyan },
          { label: 'Recommended Spend', val: formatINR(120000), sub: '/day', accent: T.yellow },
          { label: 'Spend Delta', val: `+${formatINR(10000)}`, sub: 'vs current', accent: T.lime },
          { label: 'Avg Opp Score', val: '59.5', sub: '/ 100', accent: T.yellow },
        ].map(({ label, val, sub, accent }) => (
          <div key={label} style={{ background: T.card, border: T.border, boxShadow: T.shadow, borderRadius: T.radius, padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: T.textMuted, fontWeight: 800 }}>{label.toUpperCase()}</span>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: accent, border: '2px solid #000000' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 24, fontWeight: 900, color: '#000000' }}>{val}</span>
              <span style={{ fontSize: 11, color: T.textSubtle, fontWeight: 700 }}>{sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* BODY GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>

        {/* LEFT PANE */}
        <div>
          {/* TAB BAR */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            {(['curves', 'whatif'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '8px 20px', fontSize: 12, fontWeight: 800, cursor: 'pointer', background: activeTab === tab ? T.cyan : T.card, border: activeTab === tab ? T.border : T.borderThin, boxShadow: activeTab === tab ? T.shadowSm : 'none', color: '#000000', borderRadius: '8px', fontFamily: T.fontSans }}>
                {tab === 'curves' ? 'Response Curves' : 'What-If Simulation'}
              </button>
            ))}
          </div>

          {activeTab === 'curves' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {CURVE_FIXTURE.map(curve => (
                <ErrorBoundary key={curve.campaign_id}>
                  <ResponseCurve campaignId={curve.campaign_id} sku={curve.sku} dataPoints={curve.data_points} currentSpend={curve.current_spend} recommendedSpend={curve.recommended_spend} opportunityScore={curve.opportunity_score} height="280px" />
                </ErrorBoundary>
              ))}
            </div>
          )}
          {activeTab === 'whatif' && <WhatIfPanel curves={CURVE_FIXTURE} />}
        </div>

        {/* RIGHT PANE: ACTIONS */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#000000', marginBottom: 14 }}>ACTIONS PANEL</div>
          <ActionCard action={actions[0]} onApprove={() => { }} onRollback={() => { }} />
          <ActionCard action={actions[1]} onApprove={() => { }} onRollback={() => { }} />
        </div>
      </div>
    </div>
  );
}

export function OptimizerStudio() {
  return (
    <ErrorBoundary>
      <OptimizerStudioContent />
    </ErrorBoundary>
  );
}

export default OptimizerStudio;