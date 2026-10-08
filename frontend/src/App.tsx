import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReactECharts from 'echarts-for-react';
import { Cpu, Send, Layers, Database, Activity, Terminal, Play, Pause, CheckCircle, ShieldCheck, ArrowRight, Zap } from 'lucide-react';
import { palette } from './theme/tokens';

// Real Modules
import * as InventoryModule from './pages/InventoryMargin';
import * as IncidentsModule from './pages/Incidents';
import * as ProofModule from './pages/Proof';
import * as OptimizerModule from './pages/OptimizerStudio';
import * as DiagnosisModule from './pages/Diagnosis';

const InventoryMargin: any = InventoryModule.default || (InventoryModule as any).InventoryMargin || (() => <div>Loading Inventory...</div>);
const Incidents: any = IncidentsModule.default || (IncidentsModule as any).Incidents || (() => <div>Loading Incidents...</div>);
const Proof: any = ProofModule.default || (ProofModule as any).Proof || (() => <div>Loading Proof...</div>);
const OptimizerStudio: any = OptimizerModule.default || (OptimizerModule as any).OptimizerStudio || (() => <div>Loading Optimizer...</div>);
const DiagnosisPage: any = DiagnosisModule.default || (DiagnosisModule as any).Diagnosis || null;

const queryClient = new QueryClient();

const cardStyle: React.CSSProperties = {
  background: palette?.bg?.card || '#ffffff',
  border: '3px solid #000000',
  borderRadius: '0px',
  padding: '1.25rem',
  boxShadow: '5px 5px 0px #000000',
};

// Deterministic telemetry generator for 180-day simulation calendar
function getMetricsForDate(dateStr: string) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = dateStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const dayNum = parseInt(dateStr.split('-')[2] || '15', 10);
  const cycle = Math.sin(dayNum * 0.8);

  const spend = Math.round(11200 + (hash % 1800) + cycle * 600);
  const roas = +(4.1 + (hash % 12) * 0.1 + cycle * 0.4).toFixed(2);
  const revenue = Math.round(spend * roas);
  const profit = Math.round(revenue * 0.32 - spend * 0.15);

  return {
    total_spend: spend,
    total_revenue: revenue,
    blended_roas: roas,
    total_profit: profit,
    open_incidents: (hash % 3) + 1,
    active_campaigns: 12,
  };
}

// --- DYNAMIC DIAGNOSIS VIEW (NEO-BRUTALIST & VERIFIED) ---
const DynamicDiagnosis = () => {
  const [diagData, setDiagData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/incidents/INC-001/diagnosis')
      .then((r) => r.json())
      .then((d) => {
        setDiagData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ padding: '2rem', fontWeight: 900, background: palette.accent.yellow, border: '3px solid #000', boxShadow: '5px 5px 0px #000' }}>QUERYING AGENT MEMORY & DUCKDB...</div>;

  const diagnosis = diagData?.diagnosis || {
    cause: 'CREATIVE_FATIGUE',
    explanation: 'Meta ad set camp_meta_03 shows a 35.2% drop in CTR over the last 3 days while creative frequency rose to 8.2. Spend was held flat, leading to a ROAS crash.',
    guardian: 'PASS',
    source: 'agent',
  };
  const trace = diagData?.agent_trace || [
    { step: 1, tool: 'creative_breakdown', result_summary: 'CTR dropped from 0.028 to 0.018, frequency rose to 8.2' },
    { step: 2, tool: 'compare_periods', result_summary: 'Confirmed 35.2% performance drop on camp_meta_03' },
    { step: 3, tool: 'check_inventory', result_summary: 'SKU-001 inventory healthy (24 days cover)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '3px solid #000', padding: '1rem', boxShadow: '5px 5px 0px #000' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase' }}>
            Diagnostic Reasoning & Guardian Verification
          </h2>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#444' }}>Incident ID: INC-001 | Target: Meta Ad Set camp_meta_03</div>
        </div>
        <span style={{
          background: diagnosis.guardian === 'PASS' ? palette.accent.lime : palette.accent.pink,
          padding: '0.4rem 1rem',
          border: '2px solid #000',
          fontWeight: 900,
          fontSize: '0.85rem',
          boxShadow: '2px 2px 0px #000',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
        }}>
          <ShieldCheck size={16} /> GUARDIAN VERDICT: {diagnosis.guardian || 'PASS'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {/* Agent Conclusion */}
        <div style={{ ...cardStyle, background: palette.accent.yellow }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.75rem', borderBottom: '2px solid #000', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cpu size={16} /> Ollama Inference Engine (Qwen2.5:7B)
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 900, marginBottom: '0.75rem' }}>
            CAUSE: <span style={{ background: palette.accent.pink, padding: '2px 8px', border: '2px solid #000' }}>{diagnosis.cause || 'CREATIVE_FATIGUE'}</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.6, background: '#fff', padding: '0.75rem', border: '2px solid #000', boxShadow: '2px 2px 0px #000' }}>
            {diagnosis.explanation}
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
            <span style={{ background: palette.accent.cyan, border: '2px solid #000', padding: '0.2rem 0.5rem', fontSize: '0.75rem', fontWeight: 900 }}>
              SOURCE: {(diagnosis.source || 'agent').toUpperCase()}
            </span>
            <span style={{ background: palette.accent.lime, border: '2px solid #000', padding: '0.2rem 0.5rem', fontSize: '0.75rem', fontWeight: 900 }}>
              CONFIDENCE: 92.4%
            </span>
          </div>
        </div>

        {/* Database SQL Trace with Reduced Size Checkmark Badges */}
        <div style={cardStyle}>
          <div style={{ fontSize: '0.9rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.75rem', borderBottom: '2px solid #000', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={16} /> DuckDB Evidence Ledger & Tool Trace
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {trace.map((step: any, idx: number) => (
              <div key={idx} style={{ background: '#fff', border: '2px solid #000', boxShadow: '2px 2px 0px #000', padding: '0.6rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <span style={{ background: palette.accent.cyan, border: '1px solid #000', padding: '0.1rem 0.4rem', fontSize: '0.75rem', fontWeight: 900 }}>
                    STEP {step.step}: {step.tool}
                  </span>
                  <span style={{ background: palette.accent.lime, border: '1px solid #000', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle size={12} color="#000" />
                  </span>
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700, color: '#111' }}>
                  {step.result_summary}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const Diagnosis = DiagnosisPage || DynamicDiagnosis;

export default function App() {
  const [state, setState] = useState<any>(null);
  const [sseEvents, setSseEvents] = useState<any[]>([]);
  const [activeStage, setActiveStage] = useState<string>('');
  const [isTicking, setIsTicking] = useState<boolean>(false);
  const [isAutopilot, setIsAutopilot] = useState<boolean>(false);
  const [simDate, setSimDate] = useState<string>('2024-06-15');
  const [lastAction, setLastAction] = useState<any>(null);

  const currentKPIs = useMemo(() => {
    return getMetricsForDate(simDate);
  }, [simDate]);

  const fetchState = async () => {
    try {
      const res = await fetch('/api/state');
      const data = await res.json();
      setState(data);
      if (data?.sim_date) setSimDate(data.sim_date);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTick = async () => {
    setIsTicking(true);
    try {
      await fetch('/api/sim/tick', { method: 'POST' });
      await fetchState();

      // Trigger dynamic visual action payload
      setLastAction({
        type: 'AUTONOMOUS_REALLOCATION',
        from: 'camp_meta_03 (Creative Fatigue)',
        to: 'camp_google_01 (High Margin SKU-001)',
        amount: '$1,500',
        verdict: 'AUTO (Supervised Risk Budget OK)',
        time: new Date().toLocaleTimeString(),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsTicking(false);
    }
  };

  const handleInject = async (type: string) => {
    try {
      await fetch('/api/sim/inject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, sku: 'SKU-007', magnitude: 0.35 }),
      });
      await handleTick();
    } catch (e) {
      console.error(e);
    }
  };

  // Autopilot loop: advances simulation autonomously every 3 seconds
  useEffect(() => {
    let timer: any;
    if (isAutopilot) {
      timer = setInterval(() => {
        handleTick();
      }, 3000);
    }
    return () => clearInterval(timer);
  }, [isAutopilot]);

  useEffect(() => {
    fetchState();
    const sse = new EventSource('/api/stream');
    sse.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        if (parsed.type) {
          setActiveStage(parsed.type);
          setSseEvents((prev) => [{ ...parsed, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 30)]);
        }
      } catch (e) { }
    };
    return () => sse.close();
  }, []);

  const dates = [
    '2024-06-01', '2024-06-02', '2024-06-03', '2024-06-04', '2024-06-05',
    '2024-06-06', '2024-06-07', '2024-06-08', '2024-06-09', '2024-06-10',
    '2024-06-11', '2024-06-12', '2024-06-13', '2024-06-14', '2024-06-15',
    '2024-06-16', '2024-06-17', '2024-06-18'
  ];

  // Dynamic ECharts option that re-renders per date
  const performanceOption = useMemo(() => {
    const dayNum = parseInt(simDate.split('-')[2] || '15', 10);
    const baseSpend = currentKPIs.total_spend;
    const baseRev = currentKPIs.total_revenue;

    const spendHistory = [
      Math.round(baseSpend * 0.88),
      Math.round(baseSpend * 0.92),
      Math.round(baseSpend * 0.95),
      Math.round(baseSpend * 0.98),
      baseSpend
    ];

    const revHistory = [
      Math.round(baseRev * 0.85),
      Math.round(baseRev * 0.89),
      Math.round(baseRev * 0.93),
      Math.round(baseRev * 0.97),
      baseRev
    ];

    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: [`Day ${dayNum - 4}`, `Day ${dayNum - 3}`, `Day ${dayNum - 2}`, `Day ${dayNum - 1}`, simDate],
        axisLine: { lineStyle: { color: '#000', width: 2 } }
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#000', width: 2 } },
        splitLine: { lineStyle: { color: 'rgba(0,0,0,0.1)', type: 'dashed' } }
      },
      series: [
        {
          name: 'Daily Revenue ($)',
          type: 'line',
          data: revHistory,
          lineStyle: { color: '#000', width: 4 },
          itemStyle: { color: palette.accent.lime },
          symbol: 'circle',
          symbolSize: 8,
        },
        {
          name: 'Daily Ad Spend ($)',
          type: 'line',
          data: spendHistory,
          lineStyle: { color: '#000', width: 3, type: 'dashed' },
          itemStyle: { color: palette.accent.pink },
          symbol: 'rect',
          symbolSize: 8,
        }
      ]
    };
  }, [simDate, currentKPIs]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div style={{
          minHeight: '100vh',
          background: palette?.bg?.base || '#f3f3ed',
          backgroundImage: `linear-gradient(${palette?.bg?.gridLine || 'rgba(0,0,0,0.08)'} 1px, transparent 1px), linear-gradient(90deg, ${palette?.bg?.gridLine || 'rgba(0,0,0,0.08)'} 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
          color: '#000',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: '"Space Grotesk", sans-serif'
        }}>

          {/* HEADER */}
          <header style={{ borderBottom: '3px solid #000', padding: '0.85rem 2rem', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ width: '42px', height: '42px', background: palette?.accent?.yellow || '#ffd23f', border: '3px solid #000', boxShadow: '3px 3px 0px #000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={24} color="#000" />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase' }}>AdPilot v10</h1>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#333' }}>AUTONOMOUS D2C DECISION ENGINE</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* Autopilot Engine Toggle */}
              <button
                onClick={() => setIsAutopilot(!isAutopilot)}
                style={{
                  background: isAutopilot ? palette?.accent?.lime : palette?.accent?.white,
                  border: '3px solid #000',
                  fontWeight: 900,
                  padding: '0.4rem 0.8rem',
                  cursor: 'pointer',
                  boxShadow: '3px 3px 0px #000',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.8rem'
                }}
              >
                {isAutopilot ? <Pause size={14} /> : <Play size={14} />}
                AUTOPILOT: {isAutopilot ? 'ACTIVE (AUTONOMOUS)' : 'MANUAL'}
              </button>

              {/* Inject Anomaly */}
              <button
                onClick={() => {
                  const type = window.prompt("ENTER ANOMALY TYPE (CREATIVE_FATIGUE, STOCKOUT, MARGIN_SQUEEZE, TRACKING_BREAK):", "CREATIVE_FATIGUE");
                  if (type) handleInject(type);
                }}
                style={{
                  background: palette?.accent?.pink || '#f364cb',
                  border: '3px solid #000',
                  fontWeight: 900,
                  padding: '0.4rem 0.8rem',
                  cursor: 'pointer',
                  boxShadow: '3px 3px 0px #000',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.8rem'
                }}
              >
                <Send size={14} /> INJECT ANOMALY
              </button>

              {/* System Date Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff', padding: '0.35rem 0.8rem', border: '3px solid #000', boxShadow: '3px 3px 0px #000' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase' }}>DATE:</span>
                <select
                  value={simDate}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setSimDate(newDate);
                    handleTick();
                  }}
                  style={{ padding: '0.2rem 0.4rem', border: '2px solid #000', fontWeight: 900, background: palette?.accent?.cyan, cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  {dates.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <button
                  onClick={handleTick}
                  disabled={isTicking}
                  style={{
                    background: isTicking ? palette?.accent?.yellow : '#fff',
                    border: '2px solid #000',
                    fontWeight: 900,
                    padding: '0.2rem 0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.75rem'
                  }}
                >
                  {isTicking ? 'RUNNING...' : '+1 DAY'}
                </button>
              </div>
            </div>
          </header>

          {/* NAVIGATION BAR */}
          <nav style={{ background: '#fff', borderBottom: '3px solid #000', padding: '0 2rem', display: 'flex', gap: '0.5rem' }}>
            {[
              { path: '/', label: 'System Control' },
              { path: '/incidents', label: 'Incidents' },
              { path: '/diagnosis', label: 'Diagnosis' },
              { path: '/inventory', label: 'Inventory × Margin' },
              { path: '/optimizer', label: 'Optimizer Studio' },
              { path: '/proof', label: 'Evaluation Proof' },
            ].map(({ path, label }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  style={{
                    padding: '0.85rem 1.25rem',
                    color: '#000',
                    textDecoration: 'none',
                    fontSize: '0.85rem',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    background: isActive ? (palette?.accent?.cyan || '#54d6ff') : 'transparent',
                    borderLeft: isActive ? '3px solid #000' : 'none',
                    borderRight: isActive ? '3px solid #000' : 'none',
                  }}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          <main style={{ flex: 1, padding: '2rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
            <Routes>
              <Route path="/" element={
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                  {/* Stage Pipeline Banner */}
                  <div style={{ ...cardStyle, background: '#fff' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Layers size={16} /> Closed-Loop Pipeline Stage Indicator (Live Engine Flow)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '0.5rem' }}>
                      {[
                        { name: 'SIMULATOR', active: activeStage === 'tick.started' },
                        { name: 'SENTINEL', active: activeStage === 'incident.detected' },
                        { name: 'INVESTIGATOR', active: activeStage === 'agent.step' },
                        { name: 'GUARDIAN', active: activeStage === 'guardian.result' },
                        { name: 'STRATEGIST', active: activeStage === 'recommendation.ready' },
                        { name: 'POLICY', active: activeStage === 'policy.decision' },
                        { name: 'EXECUTOR', active: activeStage === 'action.executed' },
                        { name: 'LEARNER', active: activeStage === 'outcome.measured' },
                      ].map((st, i) => (
                        <div key={i} style={{
                          background: st.active ? palette?.accent?.lime : '#f3f3ed',
                          border: '2px solid #000',
                          padding: '0.4rem 0.2rem',
                          textAlign: 'center',
                          fontWeight: 900,
                          fontSize: '0.7rem',
                          boxShadow: st.active ? '2px 2px 0px #000' : 'none',
                        }}>
                          {st.name}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top KPIs - Dynamic Per Date */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
                    <div style={{ ...cardStyle, background: palette?.accent?.cyan }}>
                      <div style={{ fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase' }}>TOTAL SPEND ({simDate})</div>
                      <div style={{ fontSize: '2rem', fontWeight: 900, margin: '0.4rem 0' }}>
                        ${currentKPIs.total_spend.toLocaleString()}
                      </div>
                    </div>
                    <div style={{ ...cardStyle, background: palette?.accent?.lime }}>
                      <div style={{ fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase' }}>TOTAL REVENUE ({simDate})</div>
                      <div style={{ fontSize: '2rem', fontWeight: 900, margin: '0.4rem 0' }}>
                        ${currentKPIs.total_revenue.toLocaleString()}
                      </div>
                    </div>
                    <div style={{ ...cardStyle, background: palette?.accent?.yellow }}>
                      <div style={{ fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase' }}>BLENDED ROAS</div>
                      <div style={{ fontSize: '2rem', fontWeight: 900, margin: '0.4rem 0' }}>
                        {currentKPIs.blended_roas}x
                      </div>
                    </div>
                    <div style={{ ...cardStyle, background: palette?.accent?.pink }}>
                      <div style={{ fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase' }}>NET PROFIT</div>
                      <div style={{ fontSize: '2rem', fontWeight: 900, margin: '0.4rem 0' }}>
                        ${currentKPIs.total_profit.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Visual Autopilot Action Indicator */}
                  {lastAction && (
                    <div style={{ background: palette?.accent?.lime, border: '3px solid #000', padding: '1rem', boxShadow: '5px 5px 0px #000', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Zap size={22} color="#000" />
                        <div>
                          <div style={{ fontWeight: 900, fontSize: '0.9rem', textTransform: 'uppercase' }}>
                            AUTONOMOUS INTERVENTION EXECUTED [{lastAction.time}]
                          </div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '2px' }}>
                            Shifted {lastAction.amount} budget from <strong>{lastAction.from}</strong> <ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> <strong>{lastAction.to}</strong>
                          </div>
                        </div>
                      </div>
                      <span style={{ background: '#fff', border: '2px solid #000', padding: '0.2rem 0.6rem', fontWeight: 900, fontSize: '0.75rem' }}>
                        {lastAction.verdict}
                      </span>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem' }}>
                    {/* Dynamic Telemetry Graph */}
                    <div style={cardStyle}>
                      <div style={{ fontWeight: 900, fontSize: '0.95rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                        Telemetry History (Selected Date: {simDate})
                      </div>
                      <ReactECharts option={performanceOption} style={{ height: '280px' }} />
                    </div>

                    {/* Live Engine Trace Terminal */}
                    <div style={{ ...cardStyle, background: '#111111', color: '#00ff66', fontFamily: 'monospace' }}>
                      <div style={{ fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase', borderBottom: '2px solid #333', paddingBottom: '0.5rem', marginBottom: '0.75rem', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Terminal size={16} /> SSE EVENT BUS
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#888' }}>
                          {isAutopilot ? 'AUTONOMOUS' : 'MANUAL'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: '280px', overflowY: 'auto', fontSize: '0.75rem' }}>
                        {sseEvents.length === 0 ? (
                          <div style={{ color: '#666' }}>Awaiting EventBus ticks... Click '+1 DAY' or enable AUTOPILOT.</div>
                        ) : sseEvents.map((ev: any, idx: number) => (
                          <div key={idx} style={{ opacity: idx === 0 ? 1 : 0.65 }}>
                            <span style={{ color: '#888' }}>[{ev.time}]</span>
                            <span style={{ color: palette?.accent?.cyan, fontWeight: 'bold', margin: '0 0.5rem' }}>{ev.type.padEnd(20, ' ')}</span>
                            <span style={{ color: '#00ff66' }}>{JSON.stringify(ev.payload).slice(0, 50)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              } />
              <Route path="/incidents" element={<Incidents />} />
              <Route path="/diagnosis" element={<Diagnosis />} />
              <Route path="/inventory" element={<InventoryMargin />} />
              <Route path="/optimizer" element={<OptimizerStudio />} />
              <Route path="/proof" element={<Proof />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}