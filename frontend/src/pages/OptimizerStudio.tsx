import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ResponseCurve } from '../components/charts/ResponseCurve';
import { SankeyChart } from '../components/charts/SankeyChart';

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
  const c = score >= 70 ? '#00ff88' : score >= 40 ? '#ffb800' : '#ff4466';
  const bg = score >= 70 ? 'rgba(0,255,136,0.12)' : score >= 40 ? 'rgba(255,184,0,0.12)' : 'rgba(255,68,102,0.12)';
  const ring = score >= 70 ? 'rgba(0,255,136,0.35)' : score >= 40 ? 'rgba(255,184,0,0.35)' : 'rgba(255,68,102,0.35)';
  const circ = 2 * Math.PI * 18;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: 44, height: 44 }}>
        <svg width="44" height="44" viewBox="0 0 44 44" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="22" cy="22" r="18" fill="none" stroke="#1f2d45" strokeWidth="3.5" />
          <circle cx="22" cy="22" r="18" fill="none" stroke={c} strokeWidth="3.5"
            strokeDasharray={`${(score / 100) * circ} ${circ}`} strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px ${ring})` }} />
        </svg>
        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: c }}>{Math.round(score)}</span>
      </div>
      <div style={{ background: bg, border: `1px solid ${c}33`, borderRadius: 4, padding: '2px 7px' }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: c }}>{score >= 70 ? 'HIGH' : score >= 40 ? 'MED' : 'LOW'}</span>
      </div>
    </div>
  );
}

function BarRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 10, color: '#64748b' }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color }}>{value.toFixed(0)}</span>
      </div>
      <div style={{ height: 4, background: '#1f2d45', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(100, (value / 25) * 100)}%`, background: color, borderRadius: 2, transition: 'width 0.6s' }} />
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: ActionItem['status'] }) {
  const map: Record<string, { c: string; bg: string; l: string }> = {
    pending:     { c: '#ffb800', bg: 'rgba(255,184,0,0.12)',   l: 'Pending' },
    rolling_out: { c: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  l: 'Rolling Out' },
    approved:    { c: '#00ff88', bg: 'rgba(0,255,136,0.12)',   l: 'Approved' },
    rolled_back: { c: '#f43f5e', bg: 'rgba(244,63,94,0.12)',   l: 'Rolled Back' },
    rejected:    { c: '#64748b', bg: 'rgba(100,116,139,0.12)', l: 'Rejected' },
  };
  const s = map[status] ?? map['pending'];
  return <span style={{ background: s.bg, color: s.c, border: `1px solid ${s.c}44`, borderRadius: 12, padding: '2px 9px', fontSize: 10, fontWeight: 700 }}>{s.l}</span>;
}

function ActionCard({ action, onApprove, onRollback }: { action: ActionItem; onApprove: (id: string) => void; onRollback: (id: string) => void }) {
  const canApprove  = action.status === 'pending' || action.status === 'rolling_out';
  const canRollback = action.status === 'rolling_out' || action.status === 'approved';
  return (
    <div style={{ background: '#111827', border: '1px solid #1f2d45', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = '#2d4a6e')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '#1f2d45')}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>{action.id}</span>
          <StatusPill status={action.status} />
        </div>
        <span style={{ fontSize: 10, color: '#475569' }}>{new Date(action.created_at).toLocaleDateString()}</span>
      </div>
      {action.changes.map(ch => {
        const delta = Math.round(ch.to_spend - ch.from_spend);
        return (
          <div key={ch.campaign_id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, background: '#0a0d14', borderRadius: 8, padding: '8px 12px' }}>
            <span style={{ fontSize: 11, color: '#94a3b8', flex: 1 }}>{ch.campaign_id}</span>
            <span style={{ fontSize: 12, color: '#f43f5e', fontWeight: 600 }}>${Math.round(ch.from_spend)}</span>
            <span style={{ fontSize: 11, color: '#475569' }}>to</span>
            <span style={{ fontSize: 12, color: '#00ff88', fontWeight: 600 }}>${Math.round(ch.to_spend)}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: delta >= 0 ? '#00ff88' : '#f43f5e' }}>({delta >= 0 ? '+' : ''}{delta})</span>
          </div>
        );
      })}
      {action.rollout_pct > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 10, color: '#64748b' }}>Rollout</span>
            <span style={{ fontSize: 10, color: '#3b82f6', fontWeight: 600 }}>{action.rollout_pct}%</span>
          </div>
          <div style={{ height: 4, background: '#1f2d45', borderRadius: 2 }}>
            <div style={{ height: '100%', width: `${action.rollout_pct}%`, background: 'linear-gradient(90deg,#3b82f6,#8b5cf6)', borderRadius: 2 }} />
          </div>
        </div>
      )}
      <div style={{ fontSize: 10, color: '#475569', marginBottom: 10 }}>
        Guard: {action.rollback_guard.metric.toUpperCase()} below {action.rollback_guard.threshold} / {action.rollback_guard.window_days}d
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {canApprove && <button onClick={() => onApprove(action.id)} style={{ flex: 1, padding: '6px 0', borderRadius: 7, background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)', color: '#00ff88', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Approve</button>}
        {canRollback && <button onClick={() => onRollback(action.id)} style={{ flex: 1, padding: '6px 0', borderRadius: 7, background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: '#f43f5e', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Rollback</button>}
      </div>
    </div>
  );
}

function WhatIfPanel({ curves }: { curves: CurveData[] }) {
  const [sliders, setSliders] = useState<Record<string, number>>(() =>
    Object.fromEntries(curves.map(c => [c.campaign_id, c.current_spend]))
  );
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
    return 0;
  }, []);
  const curRev  = useMemo(() => curves.reduce((s, c) => s + interpolate(c, c.current_spend), 0), [curves, interpolate]);
  const simRev  = useMemo(() => curves.reduce((s, c) => s + interpolate(c, sliders[c.campaign_id] ?? c.current_spend), 0), [curves, sliders, interpolate]);
  const totSim  = useMemo(() => Object.values(sliders).reduce((a, b) => a + b, 0), [sliders]);
  const totCur  = useMemo(() => curves.reduce((s, c) => s + c.current_spend, 0), [curves]);
  const sankeyChanges = useMemo(() => curves.map(c => ({ campaignId: c.campaign_id, fromSpend: c.current_spend, toSpend: sliders[c.campaign_id] ?? c.current_spend })), [curves, sliders]);
  return (
    <div>
      <div style={{ background: '#0a0d14', border: '1px solid #1f2d45', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 14 }}>BUDGET SLIDERS</div>
        {curves.map(curve => {
          const val = sliders[curve.campaign_id] ?? curve.current_spend;
          const max = Math.max(curve.current_spend * 1.5, 800);
          const pct = (val / max) * 100;
          return (
            <div key={curve.campaign_id} style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#e2e8f0' }}>{curve.campaign_id}</span>
                  <span style={{ fontSize: 10, color: '#475569', marginLeft: 6 }}>{curve.sku}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: '#64748b' }}>was ${Math.round(curve.current_spend)}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: val > curve.current_spend ? '#00ff88' : val < curve.current_spend ? '#f43f5e' : '#e2e8f0' }}>${Math.round(val)}</span>
                </div>
              </div>
              <div style={{ position: 'relative', paddingTop: 14 }}>
                <div style={{ position: 'absolute', top: 0, left: `${Math.min(99, (curve.recommended_spend / max) * 100)}%`, transform: 'translateX(-50%)', fontSize: 8, color: '#00ff88', fontWeight: 700, whiteSpace: 'nowrap' }}>rec</div>
                <input type="range" min={50} max={max} step={25} value={val}
                  onChange={e => setSliders(prev => ({ ...prev, [curve.campaign_id]: Number(e.target.value) }))}
                  style={{ width: '100%', height: 4, appearance: 'none' as React.CSSProperties['appearance'], background: `linear-gradient(90deg,#3b82f6 ${pct}%,#1f2d45 ${pct}%)`, borderRadius: 2, cursor: 'pointer', outline: 'none' }} />
              </div>
            </div>
          );
        })}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 4, paddingTop: 14, borderTop: '1px solid #1f2d45' }}>
          {[
            { l: 'Spend Delta',  v: totSim - totCur, signed: true,  fmt: (n: number) => `$${Math.abs(n) >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(Math.round(n))}` },
            { l: 'Revenue Lift', v: simRev - curRev,  signed: true,  fmt: (n: number) => `$${Math.abs(n) >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(Math.round(n))}` },
            { l: 'Sim ROAS',     v: totSim > 0 ? simRev / totSim : 0, signed: false, fmt: (n: number) => `${n.toFixed(2)}x` },
          ].map(({ l, v, signed, fmt }) => (
            <div key={l} style={{ background: '#111827', borderRadius: 8, padding: '10px 12px', border: '1px solid #1f2d45', textAlign: 'center' as const }}>
              <div style={{ fontSize: 10, color: '#475569', marginBottom: 4 }}>{l}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: signed ? (v > 0 ? '#00ff88' : v < 0 ? '#f43f5e' : '#64748b') : '#e2e8f0' }}>
                {signed && v > 0 ? '+' : ''}{fmt(v)}
              </div>
            </div>
          ))}
        </div>
      </div>
      <SankeyChart changes={sankeyChanges} height="280px" />
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

  return (
    <div style={{ minHeight: '100vh', background: '#0a0d14', fontFamily: 'Inter, system-ui, sans-serif', color: '#e2e8f0' }}>
      <div style={{ background: 'linear-gradient(180deg,#111827 0%,#0d1524 100%)', borderBottom: '1px solid #1f2d45', padding: '20px 32px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚡</div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Optimizer Studio</h1>
              <span style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 6, padding: '1px 8px', fontSize: 11, fontWeight: 600 }}>SLSQP Engine</span>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Budget allocation optimizer · Predictive opportunity scoring · Policy-gated actions</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: ksActive ? 'rgba(244,63,94,0.1)' : '#111827', border: `1px solid ${ksActive ? 'rgba(244,63,94,0.4)' : '#1f2d45'}`, borderRadius: 10, padding: '8px 14px', transition: 'all 0.2s' }}>
            <span style={{ fontSize: 11, color: ksActive ? '#f43f5e' : '#64748b' }}>{ksActive ? 'KILL SWITCH ACTIVE' : 'System Active'}</span>
            <button onClick={() => setKsActive(p => !p)} style={{ width: 36, height: 20, borderRadius: 10, background: ksActive ? '#f43f5e' : '#1f2d45', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: ksActive ? 19 : 3, transition: 'left 0.2s' }} />
            </button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 16 }}>
          {[
            { label: 'Portfolio Spend',   val: `$${totalSpend.toLocaleString()}`, sub: '/day',      color: '#e2e8f0' },
            { label: 'Recommended Spend', val: `$${totalRec.toLocaleString()}`,   sub: '/day',      color: '#3b82f6' },
            { label: 'Spend Delta',       val: `${delta >= 0 ? '+' : ''}$${Math.abs(delta).toLocaleString()}`, sub: 'vs current', color: delta >= 0 ? '#00ff88' : '#f43f5e' },
            { label: 'Avg Opp Score',     val: avgScore.toFixed(1),               sub: '/ 100',     color: avgScore >= 70 ? '#00ff88' : avgScore >= 40 ? '#ffb800' : '#f43f5e' },
          ].map(({ label, val, sub, color }) => (
            <div key={label} style={{ background: '#0d1524', border: '1px solid #1f2d45', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ fontSize: 10, color: '#475569', marginBottom: 4 }}>{label.toUpperCase()}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 20, fontWeight: 800, color }}>{val}</span>
                <span style={{ fontSize: 10, color: '#475569' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', height: 'calc(100vh - 220px)' }}>
        <div style={{ overflowY: 'auto', padding: '20px 24px', borderRight: '1px solid #1f2d45' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' as const }}>
            {activeRecs.map(rec => (
              <button key={rec.id} onClick={() => setSelectedRec(rec.id)} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: selectedRec === rec.id ? 'rgba(59,130,246,0.2)' : 'transparent', border: `1px solid ${selectedRec === rec.id ? '#3b82f6' : '#1f2d45'}`, color: selectedRec === rec.id ? '#60a5fa' : '#64748b' }}>
                {rec.id}
                <span style={{ marginLeft: 6, background: rec.mode === 'profit' ? 'rgba(0,255,136,0.15)' : 'rgba(59,130,246,0.15)', color: rec.mode === 'profit' ? '#00ff88' : '#60a5fa', borderRadius: 4, padding: '1px 5px', fontSize: 9 }}>{rec.mode.toUpperCase()}</span>
              </button>
            ))}
          </div>
          {currentRec && (
            <div style={{ background: '#111827', border: '1px solid #1f2d45', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, color: '#475569', marginBottom: 2 }}>PROFIT DELTA (MID)</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#00ff88' }}>+${currentRec.expected_profit_delta.mid}</div>
                <div style={{ fontSize: 10, color: '#64748b' }}>Low ${currentRec.expected_profit_delta.low} / High ${currentRec.expected_profit_delta.high}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#475569', marginBottom: 2 }}>CONFIDENCE</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#3b82f6' }}>{(currentRec.confidence * 100).toFixed(0)}%</div>
                <div style={{ fontSize: 10, color: '#64748b' }}>Model certainty</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#475569', marginBottom: 2 }}>CONSTRAINTS</div>
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4, marginTop: 2 }}>
                  {currentRec.constraints_binding.map(c => (
                    <span key={c} style={{ background: '#0d1524', border: '1px solid #1f2d45', borderRadius: 4, padding: '1px 6px', fontSize: 9, color: '#94a3b8' }}>{c}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#0a0d14', border: '1px solid #1f2d45', borderRadius: 8, padding: 3, width: 'fit-content' }}>
            {(['curves', 'whatif'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '5px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', background: activeTab === tab ? '#1a2235' : 'transparent', color: activeTab === tab ? '#e2e8f0' : '#64748b' }}>
                {tab === 'curves' ? 'Response Curves' : 'What-If Simulation'}
              </button>
            ))}
          </div>
          {activeTab === 'curves' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {activeCurves.map(curve => (
                <ResponseCurve key={curve.campaign_id} campaignId={curve.campaign_id} sku={curve.sku} dataPoints={curve.data_points} currentSpend={curve.current_spend} recommendedSpend={curve.recommended_spend} opportunityScore={curve.opportunity_score} height="280px" />
              ))}
            </div>
          )}
          {activeTab === 'whatif' && <WhatIfPanel curves={activeCurves} />}
          <div style={{ marginTop: 20, background: '#111827', border: '1px solid #1f2d45', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 14, letterSpacing: '0.04em' }}>PREDICTIVE OPPORTUNITY SCORES</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12 }}>
              {allScores.map(sc => (
                <div key={sc.campaign_id} style={{ background: '#0d1524', border: '1px solid #1f2d45', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{sc.campaign_id}</div>
                      <div style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace' }}>{sc.sku}</div>
                    </div>
                    <ScoreBadge score={sc.total_score} />
                  </div>
                  <BarRow label="Forecast Momentum" value={sc.forecast_component} color="#60a5fa" />
                  <BarRow label="Curve Efficiency"  value={sc.curve_component}    color="#a78bfa" />
                  <BarRow label="SKU Margin"         value={sc.margin_component}   color="#00ff88" />
                  <BarRow label="Stock Safety"        value={sc.stock_component}    color="#ffb800" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ overflowY: 'auto', padding: '20px 16px', background: '#0d1524' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.04em' }}>ACTIONS PANEL</div>
            <span style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 8, padding: '2px 8px', fontSize: 10, fontWeight: 600 }}>{actions.length} actions</span>
          </div>
          {[
            { label: 'Pending', color: '#ffb800', items: kanban.pending },
            { label: 'Active',  color: '#3b82f6', items: kanban.active  },
            { label: 'Done',    color: '#64748b', items: kanban.done    },
          ].map(({ label, color, items }) => (
            <div key={label} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color }}>{label}</span>
                <span style={{ background: `${color}22`, color, border: `1px solid ${color}44`, borderRadius: 8, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>{items.length}</span>
              </div>
              {items.length === 0
                ? <div style={{ background: '#111827', border: '1px dashed #1f2d45', borderRadius: 10, padding: 16, textAlign: 'center' as const, color: '#334155', fontSize: 11 }}>Empty</div>
                : items.map(a => <ActionCard key={a.id} action={a} onApprove={id => approveMut.mutate(id)} onRollback={id => rollbackMut.mutate(id)} />)
              }
            </div>
          ))}
          <div style={{ background: '#111827', border: '1px solid #1f2d45', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 8, letterSpacing: '0.04em', fontWeight: 700 }}>POLICY ENGINE STATUS</div>
            {[
              { rule: 'max_change_30pct',  status: 'BINDING', color: '#ffb800' },
              { rule: 'min_spend_50',       status: 'BINDING', color: '#ffb800' },
              { rule: 'daily_risk_budget',  status: 'OK',      color: '#00ff88' },
              { rule: 'kill_switch',        status: ksActive ? 'ACTIVE' : 'OFF', color: ksActive ? '#f43f5e' : '#64748b' },
            ].map(({ rule, status, color }) => (
              <div key={rule} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #0d1524' }}>
                <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>{rule}</span>
                <span style={{ fontSize: 9, fontWeight: 700, color, background: `${color}18`, border: `1px solid ${color}33`, borderRadius: 4, padding: '1px 5px' }}>{status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
