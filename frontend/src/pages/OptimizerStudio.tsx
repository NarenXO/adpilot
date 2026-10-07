import React, { useState, useCallback, useMemo, Component, type ErrorInfo, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ResponseCurve } from '../components/charts/ResponseCurve';
import { SankeyChart } from '../components/charts/SankeyChart';

// Invente '26 Neo-Brutalist design tokens
const T = {
  bg:      '#f3f3ed',
  card:    '#ffffff',
  border:  '3px solid #000000',
  shadow:  '5px 5px 0px #000000',
  shadowSm:'3px 3px 0px #000000',
  lime:    '#82e66f',
  pink:    '#f364cb',
  cyan:    '#78dbf6',
  yellow:  '#ffd23f',
  black:   '#000000',
  textPrimary:   '#000000',
  textSecondary: '#333333',
  textSubtle:    '#666666',
  fontMono: 'JetBrains Mono, Consolas, monospace',
  fontSans: 'Inter, system-ui, sans-serif',
};

class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('OptimizerStudio caught component error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{ padding: 16, background: T.card, border: T.border, boxShadow: T.shadow, textAlign: 'center', color: T.textSubtle, fontSize: 12 }}>
          Chart temporarily unavailable.
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
  const accent = score >= 70 ? T.lime : score >= 40 ? T.yellow : T.pink;
  const label  = score >= 70 ? 'HIGH' : score >= 40 ? 'MED' : 'LOW';
  const circ   = 2 * Math.PI * 18;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: 44, height: 44 }}>
        <svg width="44" height="44" viewBox="0 0 44 44" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="22" cy="22" r="18" fill="none" stroke="#ddd" strokeWidth="3.5" />
          <circle cx="22" cy="22" r="18" fill="none" stroke={accent} strokeWidth="3.5"
            strokeDasharray={`${(score / 100) * circ} ${circ}`} strokeLinecap="round" />
        </svg>
        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: T.black }}>{Math.round(score)}</span>
      </div>
      <span style={{ background: accent, color: T.black, border: T.border, padding: '2px 7px', fontSize: 10, fontWeight: 800, boxShadow: T.shadowSm }}>{label}</span>
    </div>
  );
}

function BarRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 10, color: T.textSubtle }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 800, color: T.black }}>{value.toFixed(0)}</span>
      </div>
      <div style={{ height: 6, background: '#e0e0d8', border: '1.5px solid #000', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(100, (value / 25) * 100)}%`, background: color, transition: 'width 0.6s' }} />
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: ActionItem['status'] }) {
  const map: Record<string, { accent: string; label: string }> = {
    pending:     { accent: T.yellow, label: 'Pending'     },
    rolling_out: { accent: T.cyan,   label: 'Rolling Out' },
    approved:    { accent: T.lime,   label: 'Approved'    },
    rolled_back: { accent: T.pink,   label: 'Rolled Back' },
    rejected:    { accent: '#aaa',   label: 'Rejected'    },
  };
  const s = map[status] ?? map['pending'];
  return <span style={{ background: s.accent, color: T.black, border: T.border, padding: '2px 8px', fontSize: 10, fontWeight: 800, boxShadow: '2px 2px 0px #000' }}>{s.label}</span>;
}

function ActionCard({ action, onApprove, onRollback }: { action: ActionItem; onApprove: (id: string) => void; onRollback: (id: string) => void }) {
  const canApprove  = action.status === 'pending' || action.status === 'rolling_out';
  const canRollback = action.status === 'rolling_out' || action.status === 'approved';
  return (
    <div style={{ background: T.card, border: T.border, boxShadow: T.shadow, padding: '14px 16px', marginBottom: 14, transition: 'transform 0.1s' }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'translate(-2px,-2px)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'translate(0,0)')}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: T.fontMono, fontSize: 11, fontWeight: 700, color: T.black }}>{action.id}</span>
          <StatusPill status={action.status} />
        </div>
        <span style={{ fontSize: 10, color: T.textSubtle }}>{new Date(action.created_at).toLocaleDateString()}</span>
      </div>
      {action.changes.map(ch => {
        const delta = Math.round(ch.to_spend - ch.from_spend);
        return (
          <div key={ch.campaign_id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, background: T.bg, border: '1.5px solid #000', padding: '8px 12px' }}>
            <span style={{ fontSize: 11, color: T.textSecondary, flex: 1, fontFamily: T.fontMono }}>{ch.campaign_id}</span>
            <span style={{ fontSize: 12, color: T.pink, fontWeight: 700 }}>${Math.round(ch.from_spend)}</span>
            <span style={{ fontSize: 11, color: T.textSubtle }}>&#8594;</span>
            <span style={{ fontSize: 12, color: T.black, fontWeight: 700 }}>${Math.round(ch.to_spend)}</span>
            <span style={{ fontSize: 10, fontWeight: 800, background: delta >= 0 ? T.lime : T.pink, color: T.black, padding: '1px 5px', border: '1.5px solid #000' }}>{delta >= 0 ? '+' : ''}{delta}</span>
          </div>
        );
      })}
      {action.rollout_pct > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 10, color: T.textSubtle }}>Rollout</span>
            <span style={{ fontSize: 10, color: T.black, fontWeight: 700 }}>{action.rollout_pct}%</span>
          </div>
          <div style={{ height: 8, background: '#e0e0d8', border: '1.5px solid #000' }}>
            <div style={{ height: '100%', width: `${action.rollout_pct}%`, background: T.cyan }} />
          </div>
        </div>
      )}
      <div style={{ fontSize: 10, color: T.textSubtle, marginBottom: 10, fontFamily: T.fontMono }}>
        Guard: {action.rollback_guard.metric.toUpperCase()} below {action.rollback_guard.threshold} / {action.rollback_guard.window_days}d
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {canApprove  && <button id={`approve-${action.id}`}  onClick={() => onApprove(action.id)}  style={{ flex: 1, padding: '7px 0', background: T.lime,  border: T.border, color: T.black, fontSize: 11, fontWeight: 800, cursor: 'pointer', boxShadow: T.shadowSm }}>Approve ✓</button>}
        {canRollback && <button id={`rollback-${action.id}`} onClick={() => onRollback(action.id)} style={{ flex: 1, padding: '7px 0', background: T.pink,  border: T.border, color: T.black, fontSize: 11, fontWeight: 800, cursor: 'pointer', boxShadow: T.shadowSm }}>Rollback ↩</button>}
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
      <div style={{ background: T.card, border: T.border, boxShadow: T.shadow, padding: 18, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: T.black, marginBottom: 14, letterSpacing: '0.08em' }}>BUDGET SLIDERS</div>
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
                  <span style={{ fontSize: 11, fontWeight: 700, color: T.black, fontFamily: T.fontMono }}>{curve.campaign_id}</span>
                  <span style={{ fontSize: 10, color: T.textSubtle, marginLeft: 6 }}>{curve.sku}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: T.textSubtle }}>was ${Math.round(curve.current_spend)}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, background: up ? T.lime : dn ? T.pink : T.yellow, color: T.black, padding: '1px 8px', border: '2px solid #000' }}>${Math.round(val)}</span>
                </div>
              </div>
              <div style={{ position: 'relative', paddingTop: 14 }}>
                <div style={{ position: 'absolute', top: 0, left: `${Math.min(99, (curve.recommended_spend / max) * 100)}%`, transform: 'translateX(-50%)', fontSize: 8, color: T.black, fontWeight: 800, whiteSpace: 'nowrap', background: T.lime, padding: '0 3px', border: '1px solid #000' }}>REC</div>
                <input id={`slider-${curve.campaign_id}`} type="range" min={50} max={max} step={25} value={val}
                  onChange={e => setSliders(prev => ({ ...prev, [curve.campaign_id]: Number(e.target.value) }))}
                  style={{ width: '100%', height: 6, appearance: 'none' as React.CSSProperties['appearance'], background: `linear-gradient(90deg,#000 ${pct}%,#d8d8d0 ${pct}%)`, cursor: 'pointer', outline: 'none', border: '1.5px solid #000' }} />
              </div>
            </div>
          );
        })}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 4, paddingTop: 14, borderTop: '3px solid #000' }}>
          {[
            { l: 'Spend Delta',  accent: T.lime,   v: totSim - totCur,                   signed: true,  fmt: (n: number) => `$${Math.abs(n) >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(Math.round(n))}` },
            { l: 'Revenue Lift', accent: T.cyan,   v: simRev - curRev,                   signed: true,  fmt: (n: number) => `$${Math.abs(n) >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(Math.round(n))}` },
            { l: 'Sim ROAS',     accent: T.yellow, v: totSim > 0 ? simRev / totSim : 0,  signed: false, fmt: (n: number) => `${n.toFixed(2)}x` },
          ].map(({ l, accent, v, signed, fmt }) => (
            <div key={l} style={{ background: accent, border: T.border, boxShadow: T.shadowSm, padding: '10px 12px', textAlign: 'center' as const }}>
              <div style={{ fontSize: 9, color: T.black, marginBottom: 4, fontWeight: 700, letterSpacing: '0.06em' }}>{l.toUpperCase()}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.black }}>
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

export default function OptimizerStudio() {
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

  const activeCurves = curves ?? CURVE_FIXTURE;
  const activeRecs   = recs ?? RECS_FIXTURE;
  const currentRec   = activeRecs.find(r => r.id === selectedRec) ?? activeRecs[0];
  const allScores    = scores ?? RECS_FIXTURE.flatMap(r => r.opportunity_scores);

  const kanban = useMemo(() => ({
    pending: actions.filter(a => a.status === 'pending'),
    active:  actions.filter(a => a.status === 'rolling_out' || a.status === 'approved'),
    done:    actions.filter(a => a.status === 'rolled_back' || a.status === 'rejected'),
  }), [actions]);

  const totalSpend = activeCurves.reduce((s, c) => s + c.current_spend, 0);
  const totalRec   = activeCurves.reduce((s, c) => s + c.recommended_spend, 0);
  const delta      = totalRec - totalSpend;
  const avgScore   = allScores.reduce((s, sc) => s + sc.total_score, 0) / Math.max(1, allScores.length);

  const kpiCards = [
    { id: 'kpi-portfolio-spend',   label: 'Portfolio Spend',   val: `$${totalSpend.toLocaleString()}`, sub: '/day',      accent: T.cyan   },
    { id: 'kpi-recommended-spend', label: 'Recommended Spend', val: `$${totalRec.toLocaleString()}`,   sub: '/day',      accent: T.yellow },
    { id: 'kpi-spend-delta',       label: 'Spend Delta',       val: `${delta >= 0 ? '+' : ''}$${Math.abs(delta).toLocaleString()}`, sub: 'vs current', accent: delta >= 0 ? T.lime : T.pink },
    { id: 'kpi-avg-opp-score',     label: 'Avg Opp Score',     val: avgScore.toFixed(1),               sub: '/ 100',     accent: avgScore >= 70 ? T.lime : avgScore >= 40 ? T.yellow : T.pink },
  ];

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: T.fontSans, color: T.textPrimary }}>
      {/* Header */}
      <div style={{ background: T.black, borderBottom: '3px solid #000', padding: '20px 32px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: 34, height: 34, background: T.lime, border: '3px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>&#9889;</div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: '#fff' }}>Optimizer Studio</h1>
              <span style={{ background: T.cyan, color: T.black, border: '2px solid #fff', padding: '2px 10px', fontSize: 10, fontWeight: 800, letterSpacing: '0.06em' }}>SLSQP Engine</span>
            </div>
            <p style={{ margin: 0, fontSize: 11, color: '#aaa' }}>Budget allocation optimizer · Predictive opportunity scoring · Policy-gated actions</p>
          </div>
          <div id="kill-switch-container" style={{ display: 'flex', alignItems: 'center', gap: 10, background: ksActive ? T.pink : '#222', border: `3px solid ${ksActive ? T.pink : '#555'}`, boxShadow: ksActive ? `5px 5px 0px ${T.pink}` : '5px 5px 0px #444', padding: '8px 16px', transition: 'all 0.2s' }}>
            <span style={{ fontSize: 11, color: ksActive ? T.black : '#aaa', fontWeight: 700 }}>{ksActive ? 'KILL SWITCH ACTIVE' : 'System Active'}</span>
            <button id="kill-switch-toggle" onClick={() => setKsActive(p => !p)} style={{ width: 40, height: 22, background: ksActive ? T.black : '#444', border: '2px solid #fff', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
              <div style={{ width: 14, height: 14, background: ksActive ? T.pink : '#aaa', position: 'absolute', top: 2, left: ksActive ? 22 : 2, transition: 'left 0.2s' }} />
            </button>
          </div>
        </div>
        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 18 }}>
          {kpiCards.map(({ id, label, val, sub, accent }) => (
            <div key={id} id={id} style={{ background: accent, border: '3px solid #fff', boxShadow: '4px 4px 0px rgba(255,255,255,0.3)', padding: '14px 18px' }}>
              <div style={{ fontSize: 9, color: T.black, marginBottom: 4, fontWeight: 800, letterSpacing: '0.1em' }}>{label.toUpperCase()}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: T.black }}>{val}</span>
                <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Body */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', height: 'calc(100vh - 234px)' }}>
        {/* Left */}
        <div style={{ overflowY: 'auto', padding: '20px 24px', borderRight: '3px solid #000' }}>
          {/* Rec selector */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' as const }}>
            {activeRecs.map(rec => {
              const active = selectedRec === rec.id;
              const modeAccent = rec.mode === 'profit' ? T.lime : T.cyan;
              return (
                <button key={rec.id} id={`rec-btn-${rec.id}`} onClick={() => setSelectedRec(rec.id)}
                  style={{ padding: '7px 16px', fontSize: 11, fontWeight: 800, cursor: 'pointer', background: active ? T.black : T.card, border: T.border, color: active ? T.lime : T.black, boxShadow: active ? T.shadowSm : 'none', transition: 'all 0.15s' }}>
                  {rec.id}
                  <span style={{ marginLeft: 8, background: modeAccent, color: T.black, padding: '1px 6px', fontSize: 9, fontWeight: 800, border: '1.5px solid #000' }}>{rec.mode.toUpperCase()}</span>
                </button>
              );
            })}
          </div>
          {/* Rec details */}
          {currentRec && (
            <div style={{ background: T.black, border: T.border, boxShadow: T.shadow, padding: '14px 18px', marginBottom: 16, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
              <div>
                <div style={{ fontSize: 9, color: '#aaa', marginBottom: 4, letterSpacing: '0.08em' }}>PROFIT DELTA (MID)</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: T.lime }}>+${currentRec.expected_profit_delta.mid}</div>
                <div style={{ fontSize: 10, color: '#888' }}>Low ${currentRec.expected_profit_delta.low} / High ${currentRec.expected_profit_delta.high}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: '#aaa', marginBottom: 4, letterSpacing: '0.08em' }}>CONFIDENCE</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: T.cyan }}>{(currentRec.confidence * 100).toFixed(0)}%</div>
                <div style={{ fontSize: 10, color: '#888' }}>Model certainty</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: '#aaa', marginBottom: 4, letterSpacing: '0.08em' }}>CONSTRAINTS</div>
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4, marginTop: 4 }}>
                  {currentRec.constraints_binding.map(c => (
                    <span key={c} style={{ background: T.yellow, color: T.black, border: '2px solid #fff', padding: '1px 6px', fontSize: 9, fontWeight: 700 }}>{c}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 16, border: T.border, width: 'fit-content', boxShadow: T.shadowSm }}>
            {(['curves', 'whatif'] as const).map(tab => (
              <button key={tab} id={`tab-${tab}`} onClick={() => setActiveTab(tab)}
                style={{ padding: '8px 18px', fontSize: 11, fontWeight: 800, cursor: 'pointer', border: 'none', background: activeTab === tab ? T.black : T.card, color: activeTab === tab ? T.lime : T.black, borderRight: tab === 'curves' ? '3px solid #000' : 'none', letterSpacing: '0.04em' }}>
                {tab === 'curves' ? 'Response Curves' : 'What-If Simulation'}
              </button>
            ))}
          </div>
          {activeTab === 'curves' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {activeCurves.map(curve => (
                <ErrorBoundary key={curve.campaign_id}>
                  <ResponseCurve campaignId={curve.campaign_id} sku={curve.sku} dataPoints={curve.data_points} currentSpend={curve.current_spend} recommendedSpend={curve.recommended_spend} opportunityScore={curve.opportunity_score} height="280px" />
                </ErrorBoundary>
              ))}
            </div>
          )}
          {activeTab === 'whatif' && <WhatIfPanel curves={activeCurves} />}
          {/* Opportunity Scores */}
          <div style={{ marginTop: 22, background: T.card, border: T.border, boxShadow: T.shadow, padding: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: T.black, marginBottom: 14, letterSpacing: '0.08em' }}>PREDICTIVE OPPORTUNITY SCORES</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
              {allScores.map(sc => (
                <div key={sc.campaign_id} style={{ background: T.bg, border: T.border, boxShadow: T.shadowSm, padding: '14px 16px', transition: 'transform 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'translate(-2px,-2px)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = '')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: T.black, fontFamily: T.fontMono }}>{sc.campaign_id}</div>
                      <div style={{ fontSize: 10, color: T.textSubtle, fontFamily: T.fontMono }}>{sc.sku}</div>
                    </div>
                    <ScoreBadge score={sc.total_score} />
                  </div>
                  <BarRow label="Forecast Momentum" value={sc.forecast_component} color={T.cyan}   />
                  <BarRow label="Curve Efficiency"  value={sc.curve_component}    color={T.pink}   />
                  <BarRow label="SKU Margin"         value={sc.margin_component}   color={T.lime}   />
                  <BarRow label="Stock Safety"        value={sc.stock_component}    color={T.yellow} />
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Right – Actions */}
        <div style={{ overflowY: 'auto', padding: '20px 16px', background: T.bg }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: T.black, letterSpacing: '0.08em' }}>ACTIONS PANEL</div>
            <span style={{ background: T.cyan, color: T.black, border: T.border, padding: '2px 10px', fontSize: 10, fontWeight: 800, boxShadow: T.shadowSm }}>{actions.length} actions</span>
          </div>
          {[
            { label: 'Pending', accent: T.yellow, items: kanban.pending },
            { label: 'Active',  accent: T.lime,   items: kanban.active  },
            { label: 'Done',    accent: '#bbb',    items: kanban.done    },
          ].map(({ label, accent, items }) => (
            <div key={label} style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ background: accent, color: T.black, border: T.border, padding: '2px 10px', fontSize: 10, fontWeight: 800, boxShadow: T.shadowSm }}>{label.toUpperCase()}</span>
                <span style={{ fontWeight: 800, fontSize: 12 }}>{items.length}</span>
              </div>
              {items.length === 0
                ? <div style={{ background: T.card, border: '2px dashed #000', padding: 16, textAlign: 'center' as const, color: T.textSubtle, fontSize: 11 }}>Empty</div>
                : items.map(a => <ActionCard key={a.id} action={a} onApprove={id => approveMut.mutate(id)} onRollback={id => rollbackMut.mutate(id)} />)
              }
            </div>
          ))}
          {/* Policy Engine */}
          <div style={{ background: T.black, border: '3px solid #000', boxShadow: T.shadow, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: '#aaa', marginBottom: 10, letterSpacing: '0.08em', fontWeight: 800 }}>POLICY ENGINE STATUS</div>
            {[
              { rule: 'max_change_30pct', status: 'BINDING', accent: T.yellow },
              { rule: 'min_spend_50',      status: 'BINDING', accent: T.yellow },
              { rule: 'daily_risk_budget', status: 'OK',      accent: T.lime   },
              { rule: 'kill_switch',       status: ksActive ? 'ACTIVE' : 'OFF', accent: ksActive ? T.pink : '#555' },
            ].map(({ rule, status, accent }) => (
              <div key={rule} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #333' }}>
                <span style={{ fontSize: 10, color: '#aaa', fontFamily: T.fontMono }}>{rule}</span>
                <span style={{ fontSize: 9, fontWeight: 800, color: T.black, background: accent, border: '1.5px solid #fff', padding: '2px 6px' }}>{status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
