import React, { useState, useCallback, useMemo, Component, type ErrorInfo, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ResponseCurve } from '../components/charts/ResponseCurve';
import { SankeyChart } from '../components/charts/SankeyChart';

if (typeof window !== 'undefined') {
  window.addEventListener('error', e => console.error('[OPT]', (e as any).error ?? e.message));
  window.addEventListener('unhandledrejection', e => console.error('[OPT-REJECT]', (e as any).reason));
}

// Invente '26 Neo-Brutalist design tokens
const T = {
  bg:          '#f3f3ed',
  gridLine:    '#e1e1d8',
  card:        '#ffffff',
  border:      '3px solid #000000',
  borderThin:  '2px solid #000000',
  shadow:      '4px 4px 0px #000000',
  shadowSm:    '3px 3px 0px #000000',
  radius:      '10px',
  lime:        '#82e66f',
  pink:        '#f364cb',
  cyan:        '#78dbf6',
  yellow:      '#ffd23f',
  black:       '#000000',
  white:       '#ffffff',
  textPrimary: '#000000',
  textSecondary:'#333333',
  textSubtle:  '#666666',
  textMuted:   '#4a4a4a',
  fontSans:    "'Space Grotesk', sans-serif",
  fontMono:    "'Space Grotesk', monospace",
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

const CURVE_FIXTURE: CurveData[] = [
  { campaign_id: 'camp_meta_03', sku: 'SKU-007',
    data_points: [
      { spend: 50,  revenue_low: 200,  revenue_mid: 240,  revenue_high: 275 },
      { spend: 100, revenue_low: 380,  revenue_mid: 420,  revenue_high: 460 },
      { spend: 150, revenue_low: 540,  revenue_mid: 590,  revenue_high: 645 },
      { spend: 200, revenue_low: 700,  revenue_mid: 780,  revenue_high: 860 },
      { spend: 275, revenue_low: 870,  revenue_mid: 970,  revenue_high: 1070 },
      { spend: 325, revenue_low: 940,  revenue_mid: 1060, revenue_high: 1175 },
      { spend: 400, revenue_low: 990,  revenue_mid: 1120, revenue_high: 1250 },
      { spend: 500, revenue_low: 1020, revenue_mid: 1165, revenue_high: 1305 },
      { spend: 650, revenue_low: 1040, revenue_mid: 1190, revenue_high: 1340 },
    ], current_spend: 500, recommended_spend: 325, opportunity_score: 32 },
  { campaign_id: 'camp_meta_05', sku: 'SKU-012',
    data_points: [
      { spend: 50,  revenue_low: 280,  revenue_mid: 310,  revenue_high: 345 },
      { spend: 100, revenue_low: 520,  revenue_mid: 580,  revenue_high: 640 },
      { spend: 200, revenue_low: 940,  revenue_mid: 1060, revenue_high: 1180 },
      { spend: 300, revenue_low: 1280, revenue_mid: 1450, revenue_high: 1610 },
      { spend: 400, revenue_low: 1540, revenue_mid: 1760, revenue_high: 1970 },
      { spend: 475, revenue_low: 1720, revenue_mid: 1975, revenue_high: 2215 },
      { spend: 600, revenue_low: 1910, revenue_mid: 2210, revenue_high: 2490 },
      { spend: 750, revenue_low: 2060, revenue_mid: 2395, revenue_high: 2710 },
    ], current_spend: 300, recommended_spend: 475, opportunity_score: 87 },
  { campaign_id: 'camp_google_02', sku: 'SKU-002',
    data_points: [
      { spend: 100, revenue_low: 490,  revenue_mid: 540,  revenue_high: 590 },
      { spend: 200, revenue_low: 890,  revenue_mid: 980,  revenue_high: 1075 },
      { spend: 300, revenue_low: 1220, revenue_mid: 1350, revenue_high: 1490 },
      { spend: 400, revenue_low: 1480, revenue_mid: 1650, revenue_high: 1830 },
      { spend: 500, revenue_low: 1680, revenue_mid: 1890, revenue_high: 2105 },
      { spend: 600, revenue_low: 1840, revenue_mid: 2075, revenue_high: 2315 },
    ], current_spend: 300, recommended_spend: 400, opportunity_score: 74 },
];

const RECS_FIXTURE: Recommendation[] = [
  { id: 'REC-001', incident_id: 'INC-001', mode: 'profit',
    changes: [{ campaign_id: 'camp_meta_03', from_spend: 500, to_spend: 325 }, { campaign_id: 'camp_meta_05', from_spend: 300, to_spend: 475 }],
    expected_profit_delta: { low: 45, mid: 120, high: 210 },
    constraints_binding: ['max_change_30pct', 'min_spend_50'], confidence: 0.78,
    opportunity_scores: [
      { sim_date: '2024-06-15', campaign_id: 'camp_meta_03', sku: 'SKU-007', forecast_component: 5, curve_component: 8, margin_component: 12, stock_component: 7, total_score: 32 },
      { sim_date: '2024-06-15', campaign_id: 'camp_meta_05', sku: 'SKU-012', forecast_component: 22, curve_component: 21, margin_component: 24, stock_component: 20, total_score: 87 },
    ] },
  { id: 'REC-002', incident_id: 'INC-002', mode: 'revenue',
    changes: [{ campaign_id: 'camp_google_02', from_spend: 300, to_spend: 400 }],
    expected_profit_delta: { low: 20, mid: 58, high: 95 },
    constraints_binding: ['min_spend_50'], confidence: 0.85,
    opportunity_scores: [
      { sim_date: '2024-06-15', campaign_id: 'camp_google_02', sku: 'SKU-002', forecast_component: 18, curve_component: 20, margin_component: 22, stock_component: 14, total_score: 74 },
    ] },
];

const ACTIONS_FIXTURE: ActionItem[] = [
  { id: 'ACT-001', recommendation_id: 'REC-001', status: 'rolling_out', rollout_pct: 50,
    rollback_guard: { metric: 'roas', threshold: 3.0, window_days: 2 },
    changes: [{ campaign_id: 'camp_meta_03', from_spend: 500, to_spend: 325 }], created_at: '2024-06-15T10:30:00Z' },
  { id: 'ACT-002', recommendation_id: 'REC-002', status: 'pending', rollout_pct: 0,
    rollback_guard: { metric: 'roas', threshold: 2.5, window_days: 3 },
    changes: [{ campaign_id: 'camp_google_02', from_spend: 300, to_spend: 400 }], created_at: '2024-06-15T11:00:00Z' },
  { id: 'ACT-003', recommendation_id: 'REC-003', status: 'approved', rollout_pct: 100,
    rollback_guard: { metric: 'roas', threshold: 3.5, window_days: 1 },
    changes: [{ campaign_id: 'camp_tiktok_01', from_spend: 200, to_spend: 350 }], created_at: '2024-06-14T09:00:00Z' },
  { id: 'ACT-004', recommendation_id: 'REC-004', status: 'rolled_back', rollout_pct: 30,
    rollback_guard: { metric: 'roas', threshold: 2.0, window_days: 2 },
    changes: [{ campaign_id: 'camp_meta_01', from_spend: 800, to_spend: 600 }], created_at: '2024-06-13T14:00:00Z' },
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
  const label  = num >= 70 ? 'HIGH' : num >= 40 ? 'MED' : 'LOW';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        background: '#ffffff',
        border: '2px solid #000000',
        borderRadius: '6px',
        padding: '3px 8px',
        fontWeight: 800,
        fontSize: 12,
        color: '#000000',
        boxShadow: '2px 2px 0px #000000',
      }}>
        {Math.round(num)}
      </div>
      <span style={{
        background: accent,
        color: '#000000',
        border: '2px solid #000000',
        borderRadius: '4px',
        padding: '2px 8px',
        fontSize: 10,
        fontWeight: 800,
        boxShadow: '2px 2px 0px #000000',
      }}>{label}</span>
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
    pending:     { accent: T.yellow, label: 'REVIEW'   },
    rolling_out: { accent: T.cyan,   label: 'ROLLOUT'  },
    approved:    { accent: T.lime,   label: 'AUTO'     },
    rolled_back: { accent: T.pink,   label: 'BLOCK'    },
    rejected:    { accent: T.pink,   label: 'REJECTED' },
  };
  const s = map[status] ?? map['pending'];
  return <span style={{ background: s.accent, color: '#000000', border: '2px solid #000000', padding: '2px 8px', fontSize: 10, fontWeight: 800, borderRadius: '4px', boxShadow: '1.5px 1.5px 0px #000000' }}>{s.label}</span>;
}

function ActionCard({ action, onApprove, onRollback }: { action: ActionItem; onApprove: (id: string) => void; onRollback: (id: string) => void }) {
  const canApprove  = action.status === 'pending' || action.status === 'rolling_out';
  const canRollback = action.status === 'rolling_out' || action.status === 'approved';
  const changes = action.changes ?? [];
  const guardMetric = String(action.rollback_guard?.metric ?? 'roas').toUpperCase();
  const guardThreshold = action.rollback_guard?.threshold ?? 0;
  const guardDays = action.rollback_guard?.window_days ?? 1;

  return (
    <div style={{
      background: T.card,
      border: T.border,
      boxShadow: T.shadow,
      borderRadius: T.radius,
      padding: '14px 16px',
      marginBottom: 14,
      transition: 'transform 0.1s',
    }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'translate(-2px,-2px)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'translate(0,0)')}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#000000' }}>{action.id}</span>
          <StatusPill status={action.status} />
        </div>
        <span style={{ fontSize: 10, color: T.textSubtle, fontWeight: 600 }}>{action.created_at ? new Date(action.created_at).toLocaleDateString() : 'Active'}</span>
      </div>
      {changes.map(ch => {
        const fromSpend = ch.from_spend ?? 0;
        const toSpend = ch.to_spend ?? 0;
        const delta = Math.round(toSpend - fromSpend);
        return (
          <div key={ch.campaign_id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, background: T.bg, border: '2px solid #000000', borderRadius: '6px', padding: '8px 12px' }}>
            <span style={{ fontSize: 11, color: '#000000', flex: 1, fontWeight: 700 }}>{ch.campaign_id}</span>
            <span style={{ fontSize: 12, color: T.pink, fontWeight: 800 }}>${Math.round(fromSpend)}</span>
            <span style={{ fontSize: 11, color: T.textSubtle }}>→</span>
            <span style={{ fontSize: 12, color: '#000000', fontWeight: 800 }}>${Math.round(toSpend)}</span>
            <span style={{ fontSize: 10, fontWeight: 800, background: delta >= 0 ? T.lime : T.pink, color: '#000000', padding: '1px 6px', border: '1.5px solid #000000', borderRadius: '4px', boxShadow: '1px 1px 0px #000000' }}>{delta >= 0 ? '+' : ''}{delta}</span>
          </div>
        );
      })}
      {(action.rollout_pct ?? 0) > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 10, color: T.textSubtle, fontWeight: 700 }}>Rollout</span>
            <span style={{ fontSize: 10, color: '#000000', fontWeight: 800 }}>{action.rollout_pct}%</span>
          </div>
          <div style={{ height: 8, background: '#e1e1d8', border: '1.5px solid #000000', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(100, action.rollout_pct)}%`, background: T.cyan }} />
          </div>
        </div>
      )}
      <div style={{ fontSize: 10, color: T.textMuted, marginBottom: 10, fontWeight: 700 }}>
        Guard: {guardMetric} below {guardThreshold} / {guardDays}d
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {canApprove && (
          <button id={`approve-${action.id}`} onClick={() => onApprove(action.id)} style={{
            flex: 1,
            padding: '7px 0',
            background: T.lime,
            border: '2px solid #000000',
            boxShadow: '2px 2px 0px #000000',
            color: '#000000',
            fontWeight: 700,
            fontSize: 11,
            cursor: 'pointer',
            borderRadius: '6px',
            fontFamily: T.fontSans,
          }}>
            Approve ✓
          </button>
        )}
        {canRollback && (
          <button id={`rollback-${action.id}`} onClick={() => onRollback(action.id)} style={{
            flex: 1,
            padding: '7px 0',
            background: T.pink,
            border: '2px solid #000000',
            boxShadow: '2px 2px 0px #000000',
            color: '#000000',
            fontWeight: 700,
            fontSize: 11,
            cursor: 'pointer',
            borderRadius: '6px',
            fontFamily: T.fontSans,
          }}>
            Rollback ↩
          </button>
        )}
      </div>
    </div>
  );
}

function WhatIfPanel({ curves }: { curves: CurveData[] }) {
  const [sliders, setSliders] = useState<Record<string, number>>(() =>
    Object.fromEntries(curves.map(c => [c.campaign_id, c.current_spend]))
  );
  const interpolate = useCallback((curve: CurveData, spend: number) => {
    if (!curve || !curve.data_points || curve.data_points.length === 0) return 0;
    const pts = [...curve.data_points].sort((a, b) => a.spend - b.spend);
    if (pts.length === 0) return 0;
    if (spend <= pts[0].spend) return pts[0].revenue_mid ?? 0;
    if (spend >= pts[pts.length - 1].spend) return pts[pts.length - 1].revenue_mid ?? 0;
    for (let i = 0; i < pts.length - 1; i++) {
      if (spend >= pts[i].spend && spend <= pts[i + 1].spend) {
        const denom = pts[i + 1].spend - pts[i].spend;
        if (denom === 0) return pts[i].revenue_mid ?? 0;
        const r = (spend - pts[i].spend) / denom;
        return (pts[i].revenue_mid ?? 0) + r * ((pts[i + 1].revenue_mid ?? 0) - (pts[i].revenue_mid ?? 0));
      }
    }
    return pts[0].revenue_mid ?? 0;
  }, []);
  const curRev  = useMemo(() => curves.reduce((s, c) => s + (interpolate(c, c?.current_spend ?? 0) || 0), 0), [curves, interpolate]);
  const simRev  = useMemo(() => curves.reduce((s, c) => s + (interpolate(c, sliders[c?.campaign_id] ?? c?.current_spend ?? 0) || 0), 0), [curves, sliders, interpolate]);
  const totSim  = useMemo(() => Object.values(sliders).reduce((a, b) => a + (Number(b) || 0), 0), [sliders]);
  const totCur  = useMemo(() => curves.reduce((s, c) => s + (Number(c?.current_spend) || 0), 0), [curves]);
  const sankeyChanges = useMemo(() => curves.map(c => ({ campaignId: c.campaign_id, fromSpend: c.current_spend, toSpend: sliders[c.campaign_id] ?? c.current_spend })), [curves, sliders]);
  return (
    <div>
      <div style={{ background: T.card, border: T.border, boxShadow: T.shadow, borderRadius: T.radius, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#000000', marginBottom: 16, letterSpacing: '0.06em' }}>BUDGET SLIDERS</div>
        {curves.map(curve => {
          const val = sliders[curve.campaign_id] ?? curve.current_spend;
          const max = Math.max(curve.current_spend * 1.5, 800);
          const pct = (val / max) * 100;
          const up  = val > curve.current_spend;
          const dn  = val < curve.current_spend;
          return (
            <div key={curve.campaign_id} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#000000' }}>{curve.campaign_id}</span>
                  <span style={{ fontSize: 11, color: T.textSubtle, marginLeft: 8, fontWeight: 600 }}>{curve.sku}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: T.textSubtle, fontWeight: 600 }}>was ${Math.round(curve.current_spend)}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, background: up ? T.lime : dn ? T.pink : T.yellow, color: '#000000', padding: '2px 8px', border: '2px solid #000000', borderRadius: '4px', boxShadow: '1.5px 1.5px 0px #000000' }}>${Math.round(val)}</span>
                </div>
              </div>
              <div style={{ position: 'relative', paddingTop: 14 }}>
                <div style={{ position: 'absolute', top: 0, left: `${Math.min(99, (curve.recommended_spend / max) * 100)}%`, transform: 'translateX(-50%)', fontSize: 9, color: '#000000', fontWeight: 800, whiteSpace: 'nowrap', background: T.lime, padding: '1px 5px', border: '1.5px solid #000000', borderRadius: '3px' }}>REC</div>
                <input id={`slider-${curve.campaign_id}`} type="range" min={50} max={max} step={25} value={val}
                  onChange={e => setSliders(prev => ({ ...prev, [curve.campaign_id]: Number(e.target.value) }))}
                  style={{ width: '100%', height: 8, appearance: 'none' as React.CSSProperties['appearance'], background: `linear-gradient(90deg,#000000 ${pct}%,#e1e1d8 ${pct}%)`, cursor: 'pointer', outline: 'none', border: '2px solid #000000', borderRadius: '4px' }} />
              </div>
            </div>
          );
        })}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 4, paddingTop: 16, borderTop: '2px solid #000000' }}>
          {[
            { l: 'Spend Delta',  accent: T.lime,   v: totSim - totCur,                   signed: true,  fmt: (n: number) => `$${Math.abs(n) >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(Math.round(n))}` },
            { l: 'Revenue Lift', accent: T.cyan,   v: simRev - curRev,                   signed: true,  fmt: (n: number) => `$${Math.abs(n) >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(Math.round(n))}` },
            { l: 'Sim ROAS',     accent: T.yellow, v: totSim > 0 ? simRev / totSim : 0,  signed: false, fmt: (n: number) => `${n.toFixed(2)}x` },
          ].map(({ l, accent, v, signed, fmt }) => (
            <div key={l} style={{ background: accent, border: T.borderThin, borderRadius: '8px', boxShadow: '2px 2px 0px #000000', padding: '10px 12px', textAlign: 'center' as const }}>
              <div style={{ fontSize: 10, color: '#000000', marginBottom: 4, fontWeight: 800, letterSpacing: '0.06em' }}>{l.toUpperCase()}</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#000000' }}>
                {signed && v > 0 ? '+' : ''}{fmt(v)}
              </div>
            </div>
          ))}
        </div>
      </div>
      <ErrorBoundary>
        <SankeyChart changes={sankeyChanges} height="280px" />
      </ErrorBoundary>
    </div>
  );
}

function OptimizerStudioContent() {
  const qc = useQueryClient();
  const [selectedRec, setSelectedRec] = useState(RECS_FIXTURE[0].id);
  const [activeTab, setActiveTab]     = useState<'curves' | 'whatif'>('curves');
  const [ksActive, setKsActive]       = useState(false);
  const [actions, setActions]         = useState<ActionItem[]>(ACTIONS_FIXTURE);

  const { data: curves } = useQuery<CurveData[]>({
    queryKey: ['opt-curves'],
    queryFn: () => fetchFallback<{ curves: CurveData[] }>(`${API_BASE}/optimizer/curves`, { curves: CURVE_FIXTURE }).then(r => r.curves),
    staleTime: 60_000,
  });
  const { data: recs } = useQuery<Recommendation[]>({
    queryKey: ['recs'],
    queryFn: () => fetchFallback<{ recommendations: Recommendation[] }>(`${API_BASE}/recommendations`, { recommendations: RECS_FIXTURE }).then(r => r.recommendations),
    staleTime: 30_000,
  });
  const { data: scores } = useQuery<OpportunityScore[]>({
    queryKey: ['opp-scores'],
    queryFn: () => fetchFallback<{ scores: OpportunityScore[] }>(`${API_BASE}/optimizer/scores`, { scores: RECS_FIXTURE.flatMap(r => r.opportunity_scores) }).then(r => r.scores),
    staleTime: 30_000,
  });

  const approveMut = useMutation({
    mutationFn: doApprove,
    onSuccess: (_, id) => { setActions(prev => prev.map(a => a.id === id ? { ...a, status: 'approved' as const, rollout_pct: 100 } : a)); qc.invalidateQueries({ queryKey: ['actions'] }); },
  });
  const rollbackMut = useMutation({
    mutationFn: doRollback,
    onSuccess: (_, id) => { setActions(prev => prev.map(a => a.id === id ? { ...a, status: 'rolled_back' as const } : a)); qc.invalidateQueries({ queryKey: ['actions'] }); },
  });

  const activeCurves = (curves && curves.length ? curves : CURVE_FIXTURE);
  const activeRecs   = (recs && recs.length ? recs : RECS_FIXTURE);
  const currentRec   = activeRecs.find(r => r.id === selectedRec) ?? activeRecs[0];
  const allScores    = (scores && scores.length ? scores : RECS_FIXTURE.flatMap(r => r.opportunity_scores ?? []));

  const kanban = useMemo(() => ({
    pending: actions.filter(a => a.status === 'pending'),
    active:  actions.filter(a => a.status === 'rolling_out' || a.status === 'approved'),
    done:    actions.filter(a => a.status === 'rolled_back' || a.status === 'rejected'),
  }), [actions]);

  const totalSpend = activeCurves.reduce((s, c) => s + (c.current_spend ?? 0), 0);
  const totalRec   = activeCurves.reduce((s, c) => s + (c.recommended_spend ?? 0), 0);
  const delta      = totalRec - totalSpend;
  const avgScore   = allScores.reduce((s, sc) => s + (sc.total_score ?? 0), 0) / Math.max(1, allScores.length);

  const kpiCards = [
    { id: 'kpi-portfolio-spend',   label: 'Portfolio Spend',   val: `$${totalSpend.toLocaleString()}`, sub: '/day',      accent: T.cyan   },
    { id: 'kpi-recommended-spend', label: 'Recommended Spend', val: `$${totalRec.toLocaleString()}`,   sub: '/day',      accent: T.yellow },
    { id: 'kpi-spend-delta',       label: 'Spend Delta',       val: `${delta >= 0 ? '+' : ''}$${Math.abs(delta).toLocaleString()}`, sub: 'vs current', accent: delta >= 0 ? T.lime : T.pink },
    { id: 'kpi-avg-opp-score',     label: 'Avg Opp Score',     val: avgScore.toFixed(1),               sub: '/ 100',     accent: avgScore >= 70 ? T.lime : avgScore >= 40 ? T.yellow : T.pink },
  ];

  return (
    <div style={{ margin: '-2rem', minHeight: 'calc(100vh - 130px)', background: T.bg, fontFamily: T.fontSans, color: T.textPrimary, padding: '24px 32px' }}>
      {/* Header */}
      <div style={{
        background: T.card,
        border: T.border,
        boxShadow: T.shadow,
        borderRadius: T.radius,
        padding: '20px 24px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 34, height: 34, background: T.lime, border: T.borderThin, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, boxShadow: '2px 2px 0px #000' }}>⚡</div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: '#000000' }}>Optimizer Studio</h1>
            <span style={{ background: T.cyan, color: '#000000', border: T.borderThin, borderRadius: '4px', padding: '2px 10px', fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', boxShadow: '2px 2px 0px #000' }}>SLSQP Engine</span>
          </div>
          <p style={{ margin: 0, fontSize: 11, color: T.textMuted, fontWeight: 600 }}>Budget allocation optimizer · Predictive opportunity scoring · Policy-gated actions</p>
        </div>
        <div id="kill-switch-container" style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: ksActive ? T.pink : T.card,
          border: T.border,
          boxShadow: T.shadowSm,
          borderRadius: '8px',
          padding: '8px 16px',
          transition: 'all 0.2s',
        }}>
          <span style={{ fontSize: 11, color: '#000000', fontWeight: 800 }}>{ksActive ? 'KILL SWITCH ACTIVE' : 'System Active'}</span>
          <button id="kill-switch-toggle" onClick={() => setKsActive(p => !p)} style={{
            width: 44,
            height: 24,
            background: ksActive ? '#000000' : '#e1e1d8',
            border: T.borderThin,
            borderRadius: '12px',
            cursor: 'pointer',
            position: 'relative',
            transition: 'background 0.2s',
          }}>
            <div style={{
              width: 16,
              height: 16,
              background: ksActive ? T.pink : '#ffffff',
              border: '1.5px solid #000000',
              borderRadius: '50%',
              position: 'absolute',
              top: 2,
              left: ksActive ? 22 : 2,
              transition: 'left 0.2s',
            }} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
        {kpiCards.map(({ id, label, val, sub, accent }) => (
          <div key={id} id={id} style={{
            background: T.card,
            border: T.border,
            boxShadow: T.shadow,
            borderRadius: T.radius,
            padding: '16px 20px',
            position: 'relative',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: T.textMuted, fontWeight: 800, letterSpacing: '0.08em' }}>{label.toUpperCase()}</span>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: accent, border: '2px solid #000000' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 24, fontWeight: 900, color: '#000000' }}>{val}</span>
              <span style={{ fontSize: 11, color: T.textSubtle, fontWeight: 700 }}>{sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Body */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
        {/* Left */}
        <div style={{ overflowY: 'auto' }}>
          {/* Rec selector */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' as const }}>
            {(activeRecs ?? []).map(rec => {
              const active = selectedRec === rec.id;
              const modeStr = String(rec.mode ?? 'profit').toLowerCase();
              const modeAccent = modeStr === 'profit' ? T.lime : T.cyan;
              return (
                <button key={rec.id} id={`rec-btn-${rec.id}`} onClick={() => setSelectedRec(rec.id)}
                  style={{
                    padding: '8px 18px',
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                    background: active ? T.cyan : T.card,
                    border: active ? T.border : T.borderThin,
                    boxShadow: active ? T.shadowSm : 'none',
                    color: '#000000',
                    borderRadius: '8px',
                    transition: 'all 0.15s',
                    fontFamily: T.fontSans,
                  }}>
                  {rec.id}
                  <span style={{
                    marginLeft: 8,
                    background: modeAccent,
                    color: '#000000',
                    padding: '2px 8px',
                    fontSize: 10,
                    fontWeight: 800,
                    border: '1.5px solid #000000',
                    borderRadius: '4px',
                    boxShadow: '1px 1px 0px #000000',
                  }}>
                    {modeStr.toUpperCase()}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Rec details */}
          {currentRec && (
            <div style={{
              background: T.card,
              border: T.border,
              boxShadow: T.shadow,
              borderRadius: T.radius,
              padding: '18px 20px',
              marginBottom: 20,
              display: 'grid',
              gridTemplateColumns: 'repeat(3,1fr)',
              gap: 16,
            }}>
              <div>
                <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 700, marginBottom: 4, letterSpacing: '0.06em' }}>PROFIT DELTA (MID)</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#000000' }}>
                  <span style={{ background: (currentRec?.expected_profit_delta?.mid ?? 0) >= 0 ? T.lime : T.pink, border: T.borderThin, borderRadius: '4px', padding: '2px 8px', boxShadow: '2px 2px 0px #000' }}>
                    {(currentRec?.expected_profit_delta?.mid ?? 0) >= 0 ? '+' : ''}${(currentRec?.expected_profit_delta?.mid ?? 0).toFixed(0)}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: T.textSubtle, fontWeight: 600, marginTop: 6 }}>
                  Low ${(currentRec?.expected_profit_delta?.low ?? 0).toFixed(0)} / High ${(currentRec?.expected_profit_delta?.high ?? 0).toFixed(0)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 700, marginBottom: 4, letterSpacing: '0.06em' }}>CONFIDENCE</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#000000' }}>
                  <span style={{ background: T.cyan, border: T.borderThin, borderRadius: '4px', padding: '2px 8px', boxShadow: '2px 2px 0px #000' }}>
                    {((currentRec?.confidence ?? 0) * 100).toFixed(0)}%
                  </span>
                </div>
                <div style={{ fontSize: 11, color: T.textSubtle, fontWeight: 600, marginTop: 6 }}>Model certainty</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 700, marginBottom: 4, letterSpacing: '0.06em' }}>CONSTRAINTS BINDING</div>
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginTop: 4 }}>
                  {(currentRec?.constraints_binding ?? []).map(c => (
                    <span key={c} style={{ background: T.yellow, color: '#000000', border: T.borderThin, borderRadius: '4px', padding: '2px 8px', fontSize: 10, fontWeight: 800, boxShadow: '2px 2px 0px #000' }}>{c}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            {(['curves', 'whatif'] as const).map(tab => {
              const isActive = activeTab === tab;
              return (
                <button key={tab} id={`tab-${tab}`} onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '8px 20px',
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                    background: isActive ? T.cyan : T.card,
                    border: isActive ? T.border : T.borderThin,
                    boxShadow: isActive ? T.shadowSm : 'none',
                    color: '#000000',
                    borderRadius: '8px',
                    letterSpacing: '0.04em',
                    fontFamily: T.fontSans,
                    transition: 'all 0.15s',
                  }}>
                  {tab === 'curves' ? 'Response Curves' : 'What-If Simulation'}
                </button>
              );
            })}
          </div>

          {activeTab === 'curves' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {(activeCurves ?? []).map(curve => (
                <ErrorBoundary key={curve.campaign_id}>
                  <ResponseCurve campaignId={curve.campaign_id} sku={curve.sku} dataPoints={curve.data_points ?? []} currentSpend={curve.current_spend ?? 0} recommendedSpend={curve.recommended_spend ?? 0} opportunityScore={curve.opportunity_score ?? 0} height="280px" />
                </ErrorBoundary>
              ))}
            </div>
          )}
          {activeTab === 'whatif' && <WhatIfPanel curves={activeCurves} />}

          {/* Opportunity Scores */}
          <div style={{ marginTop: 20, background: T.card, border: T.border, boxShadow: T.shadow, borderRadius: T.radius, padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#000000', marginBottom: 16, letterSpacing: '0.06em' }}>PREDICTIVE OPPORTUNITY SCORES</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
              {(allScores ?? []).map((sc, scIdx) => (
                <div key={`${sc.campaign_id}-${sc.sku}-${scIdx}`} style={{
                  background: T.bg,
                  border: T.border,
                  boxShadow: T.shadowSm,
                  borderRadius: '8px',
                  padding: '14px 16px',
                  transition: 'transform 0.1s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'translate(-2px,-2px)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = '')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#000000' }}>{sc.campaign_id}</div>
                      <div style={{ fontSize: 10, color: T.textSubtle, fontWeight: 600 }}>{sc.sku}</div>
                    </div>
                    <ScoreBadge score={Number(sc.total_score ?? 0)} />
                  </div>
                  <BarRow label="Forecast Momentum" value={sc.forecast_component ?? 0} color={T.cyan}   />
                  <BarRow label="Curve Efficiency"  value={sc.curve_component ?? 0}    color={T.pink}   />
                  <BarRow label="SKU Margin"         value={sc.margin_component ?? 0}   color={T.lime}   />
                  <BarRow label="Stock Safety"        value={sc.stock_component ?? 0}    color={T.yellow} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right – Actions */}
        <div style={{ overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#000000', letterSpacing: '0.06em' }}>ACTIONS PANEL</div>
            <span style={{ background: T.cyan, color: '#000000', border: T.borderThin, padding: '2px 10px', fontSize: 11, fontWeight: 800, borderRadius: '4px', boxShadow: '2px 2px 0px #000' }}>{(actions ?? []).length} actions</span>
          </div>
          {[
            { label: 'REVIEW', accent: T.yellow, items: kanban.pending },
            { label: 'AUTO',   accent: T.lime,   items: kanban.active  },
            { label: 'BLOCK',  accent: T.pink,   items: kanban.done    },
          ].map(({ label, accent, items }) => (
            <div key={label} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ background: accent, color: '#000000', border: '3px solid #000000', padding: '3px 12px', fontSize: 11, fontWeight: 800, borderRadius: '6px', boxShadow: '3px 3px 0px #000000' }}>{label}</span>
                <span style={{ fontWeight: 800, fontSize: 12, color: '#000000' }}>{(items ?? []).length}</span>
              </div>
              {(items ?? []).length === 0
                ? <div style={{ background: T.card, border: '2px dashed #000000', borderRadius: '8px', padding: 16, textAlign: 'center' as const, color: T.textSubtle, fontSize: 11, fontWeight: 600 }}>Empty</div>
                : items.map(a => <ActionCard key={a.id} action={a} onApprove={id => approveMut.mutate(id)} onRollback={id => rollbackMut.mutate(id)} />)
              }
            </div>
          ))}

          {/* Policy Engine */}
          <div style={{ background: T.card, border: T.border, boxShadow: T.shadow, borderRadius: T.radius, padding: '16px 18px', marginTop: 16 }}>
            <div style={{ fontSize: 11, color: '#000000', marginBottom: 12, letterSpacing: '0.06em', fontWeight: 800 }}>POLICY ENGINE STATUS</div>
            {[
              { rule: 'max_change_30pct', status: 'BINDING', accent: T.yellow },
              { rule: 'min_spend_50',      status: 'BINDING', accent: T.yellow },
              { rule: 'daily_risk_budget', status: 'OK',      accent: T.lime   },
              { rule: 'kill_switch',       status: ksActive ? 'ACTIVE' : 'OFF', accent: ksActive ? T.pink : '#e1e1d8' },
            ].map(({ rule, status, accent }) => (
              <div key={rule} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1.5px solid #e1e1d8' }}>
                <span style={{ fontSize: 11, color: '#000000', fontWeight: 700 }}>{rule}</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#000000', background: accent, border: T.borderThin, borderRadius: '4px', padding: '2px 8px', boxShadow: '1.5px 1.5px 0px #000' }}>{status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OptimizerStudio() {
  return (
    <ErrorBoundary>
      <OptimizerStudioContent />
    </ErrorBoundary>
  );
}
