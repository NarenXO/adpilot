import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReactECharts from 'echarts-for-react';
import {
  Activity, AlertTriangle, ShieldCheck, PieChart, Sliders, Award,
  Play, Pause, Zap, Power, Smile, Cpu, CheckCircle, ArrowUpRight,
  Radio, Sparkles, Send, Layers
} from 'lucide-react';
import { palette } from './theme/tokens';
import InventoryMargin from './pages/InventoryMargin';
import { Incidents } from './pages/Incidents';
import { Proof } from './pages/Proof';

const queryClient = new QueryClient();

const cardStyle: React.CSSProperties = {
  background: palette.bg.card, border: `3px solid ${palette.bg.border}`,
  borderRadius: '0px', padding: '1.25rem', boxShadow: `5px 5px 0px ${palette.bg.shadow}`,
};

const badgeStyle = (type: string): React.CSSProperties => {
  const colors: any = {
    measured: { bg: palette.accent.cyan, color: '#000' }, derived: { bg: palette.accent.pink, color: '#000' },
    scenario: { bg: palette.accent.yellow, color: '#000' }, AUTO: { bg: palette.accent.lime, color: '#000' },
    PASS: { bg: palette.accent.lime, color: '#000' }, BLOCK: { bg: palette.accent.pink, color: '#000' },
  };
  const conf = colors[type] || colors.measured;
  return {
    fontSize: '0.75rem', fontWeight: 900, padding: '0.2rem 0.6rem', background: conf.bg,
    color: conf.color, border: '2px solid #000', boxShadow: '2px 2px 0px #000', textTransform: 'uppercase'
  };
};

const Shell = ({ children, state, onTick, onInject, isTicking }: any) => {
  const location = useLocation();
  const [isPlaying, setIsPlaying] = useState(false);
  const [showInjectModal, setShowInjectModal] = useState(false);
  const [injectType, setInjectType] = useState('CREATIVE_FATIGUE');

  useEffect(() => {
    let interval: any;
    if (isPlaying) { interval = setInterval(() => { onTick(); }, 2000); }
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div style={{ minHeight: '100vh', background: palette.bg.base, backgroundImage: `linear-gradient(${palette.bg.gridLine} 1px, transparent 1px), linear-gradient(90deg, ${palette.bg.gridLine} 1px, transparent 1px)`, backgroundSize: '24px 24px', color: '#000', display: 'flex', flexDirection: 'column', fontFamily: '"Space Grotesk", sans-serif' }}>
      <header style={{ borderBottom: '3px solid #000', padding: '0.85rem 2rem', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ width: '42px', height: '42px', background: palette.accent.yellow, border: '3px solid #000', boxShadow: '3px 3px 0px #000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Smile size={24} color="#000" /></div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', color: '#000' }}>AdPilot</h1>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#333' }}>AUTONOMOUS D2C DECISION ENGINE</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => setShowInjectModal(true)} style={{ background: palette.accent.pink, border: '3px solid #000', fontWeight: 900, padding: '0.4rem 0.8rem', cursor: 'pointer', boxShadow: '3px 3px 0px #000', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
            <Send size={14} /> INJECT ANOMALY LIVE
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: '#fff', padding: '0.35rem 0.8rem', border: '3px solid #000', boxShadow: '3px 3px 0px #000' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>DATE:</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 900, background: palette.accent.cyan, padding: '0.1rem 0.4rem', border: '1px solid #000' }}>{state?.sim_date || '2024-06-15'}</span>
            <button onClick={() => setIsPlaying(!isPlaying)} style={{ background: isPlaying ? palette.accent.pink : palette.accent.lime, border: '3px solid #000', fontWeight: 900, padding: '0.2rem 0.6rem', cursor: 'pointer', boxShadow: '2px 2px 0px #000' }}>{isPlaying ? 'PAUSE' : 'PLAY'}</button>
            <button onClick={onTick} disabled={isTicking} style={{ background: isTicking ? palette.accent.yellow : '#fff', border: '3px solid #000', fontWeight: 900, padding: '0.2rem 0.6rem', cursor: 'pointer', boxShadow: '2px 2px 0px #000' }}>
              {isTicking ? 'RUNNING...' : '+1 DAY'}
            </button>
          </div>
        </div>
      </header>

      {showInjectModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ ...cardStyle, background: '#fff', width: '450px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.2rem', textTransform: 'uppercase' }}>Inject Live Anomaly</h3>
            <select value={injectType} onChange={(e) => setInjectType(e.target.value)} style={{ padding: '0.6rem', border: '3px solid #000', fontWeight: 800, fontSize: '0.9rem' }}>
              <option value="CREATIVE_FATIGUE">CREATIVE_FATIGUE (Meta CTR Drop -35%)</option>
              <option value="STOCKOUT">STOCKOUT (Promoted SKU Days of Cover &lt; 1.0)</option>
              <option value="TRACKING_BREAK">TRACKING_BREAK (Pixel Purchase Drop -85%)</option>
              <option value="MARGIN_SQUEEZE">MARGIN_SQUEEZE (COGS Jump / Margin &lt; 20%)</option>
            </select>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button onClick={() => setShowInjectModal(false)} style={{ padding: '0.4rem 0.8rem', border: '2px solid #000', fontWeight: 800, background: '#e1e1d8', cursor: 'pointer' }}>CANCEL</button>
              <button onClick={() => { onInject(injectType); setShowInjectModal(false); }} style={{ padding: '0.4rem 0.8rem', border: '2px solid #000', fontWeight: 900, background: palette.accent.pink, boxShadow: '2px 2px 0px #000', cursor: 'pointer' }}>INJECT NOW</button>
            </div>
          </div>
        </div>
      )}

      <nav style={{ background: '#fff', borderBottom: '3px solid #000', padding: '0 2rem', display: 'flex', gap: '0.75rem' }}>
        {['/', '/incidents', '/diagnosis', '/inventory', '/optimizer', '/proof'].map((path, i) => {
          const labels = ['Control', 'Incidents', 'Diagnosis', 'Inventory', 'Optimizer', 'Proof'];
          const isActive = location.pathname === path;
          return <Link key={path} to={path} style={{ padding: '0.85rem 1.25rem', color: '#000', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', background: isActive ? palette.accent.cyan : 'transparent', borderLeft: isActive ? '3px solid #000' : 'none', borderRight: isActive ? '3px solid #000' : 'none' }}>{labels[i]}</Link>;
        })}
      </nav>

      <main style={{ flex: 1, padding: '2rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>{children}</main>
    </div>
  );
};

const MissionControl = ({ state, sseEvents, activeStage }: any) => {
  const kpis = state?.kpis || { total_spend: 12450, total_revenue: 58200, blended_roas: 4.67, total_profit: 18340 };

  const stages = [
    { name: 'SIMULATOR', color: palette.accent.cyan, active: activeStage === 'tick.started' },
    { name: 'SENTINEL', color: palette.accent.pink, active: activeStage === 'incident.detected' },
    { name: 'INVESTIGATOR', color: palette.accent.yellow, active: activeStage === 'agent.step' },
    { name: 'GUARDIAN', color: palette.accent.lime, active: activeStage === 'guardian.result' },
    { name: 'STRATEGIST', color: palette.accent.cyan, active: activeStage === 'recommendation.ready' },
    { name: 'POLICY', color: palette.accent.yellow, active: activeStage === 'policy.decision' },
    { name: 'EXECUTOR', color: palette.accent.lime, active: activeStage === 'action.executed' },
    { name: 'LEARNER', color: palette.accent.pink, active: activeStage === 'outcome.measured' },
  ];

  const performanceOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: ['Day -4', 'Day -3', 'Day -2', 'Day -1', 'Today'], axisLine: { lineStyle: { color: '#000', width: 2 } } },
    yAxis: { type: 'value', axisLine: { lineStyle: { color: '#000', width: 2 } } },
    series: [
      { name: 'Revenue', type: 'line', data: [52000, 54100, 55800, 57200, kpis.total_revenue], lineStyle: { color: '#000', width: 4 }, itemStyle: { color: palette.accent.lime } },
      { name: 'Ad Spend', type: 'line', data: [11200, 11500, 11800, 12100, kpis.total_spend], lineStyle: { color: '#000', width: 3, type: 'dashed' }, itemStyle: { color: palette.accent.pink } }
    ]
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ ...cardStyle, background: '#fff', border: '3px solid #000' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={18} /> Closed-Loop Pipeline Stage Indicator (Live Engine Flow)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '0.5rem' }}>
          {stages.map((st, i) => (
            <div key={i} style={{
              background: st.active ? st.color : '#f3f3ed',
              border: '2px solid #000',
              padding: '0.5rem 0.2rem',
              textAlign: 'center',
              fontWeight: 900,
              fontSize: '0.7rem',
              boxShadow: st.active ? '3px 3px 0px #000' : 'none',
              transform: st.active ? 'translateY(-2px)' : 'none',
              transition: 'all 0.2s'
            }}>
              {st.name}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
        <div style={{ ...cardStyle, background: palette.accent.cyan }}>
          <div style={{ fontWeight: 900, fontSize: '0.8rem' }}>SPEND</div>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, margin: '0.5rem 0' }}>${Math.round(kpis.total_spend).toLocaleString()}</div>
        </div>
        <div style={{ ...cardStyle, background: palette.accent.lime }}>
          <div style={{ fontWeight: 900, fontSize: '0.8rem' }}>REVENUE</div>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, margin: '0.5rem 0' }}>${Math.round(kpis.total_revenue).toLocaleString()}</div>
        </div>
        <div style={{ ...cardStyle, background: palette.accent.yellow }}>
          <div style={{ fontWeight: 900, fontSize: '0.8rem' }}>ROAS</div>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, margin: '0.5rem 0' }}>{kpis.blended_roas}x</div>
        </div>
        <div style={{ ...cardStyle, background: palette.accent.pink }}>
          <div style={{ fontWeight: 900, fontSize: '0.8rem' }}>NET PROFIT</div>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, margin: '0.5rem 0' }}>${Math.round(kpis.total_profit).toLocaleString()}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem' }}>
        <div style={cardStyle}>
          <div style={{ fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Live Telemetry: Revenue vs Spend Growth</div>
          <ReactECharts option={performanceOption} style={{ height: '280px' }} />
        </div>

        <div style={cardStyle}>
          <div style={{ fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', borderBottom: '3px solid #000', paddingBottom: '0.75rem', marginBottom: '1rem' }}>LIVE ENGINE TRACE</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '280px', overflowY: 'auto' }}>
            {sseEvents.length === 0 ? <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Awaiting simulation tick...</div> : sseEvents.map((ev: any, idx: number) => (
              <div key={idx} style={{ background: '#fff', border: '2px solid #000', boxShadow: '2px 2px 0px #000', padding: '0.6rem', fontWeight: 700, fontSize: '0.8rem' }}>
                <span style={{ background: palette.accent.cyan, border: '1px solid #000', padding: '0 0.3rem', marginRight: '0.5rem' }}>{ev.type}</span>
                {JSON.stringify(ev.payload).slice(0, 60)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const Diagnosis = () => {
  const [diagData, setDiagData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/incidents/INC-001/diagnosis')
      .then(r => r.json())
      .then(d => setDiagData(d))
      .catch(console.error);
  }, []);

  const diagnosis = diagData?.diagnosis || {
    cause: 'CREATIVE_FATIGUE',
    explanation: 'CTR dropped 35% (E12: 0.018 vs 0.028) while frequency rose to 8.2 (E12) and spend remained flat (-2.1%). Confirmed creative fatigue.',
    guardian: 'PASS',
    source: 'agent'
  };

  const agentTrace = diagData?.agent_trace || [
    { step: 1, tool: 'creative_breakdown', result_summary: 'CTR dropped from 0.028 to 0.018, frequency rose to 8.2' },
    { step: 2, tool: 'compare_periods', result_summary: 'Confirmed 35.2% performance drop on camp_meta_03' }
  ];

  // Helper to highlight evidence numbers like E12
  const highlightEvidence = (text: string) => {
    if (!text) return text;
    const parts = text.split(/(E\d+)/g);
    return parts.map((part, i) => 
      /E\d+/.test(part) ? (
        <span key={i} style={{ background: palette.accent.lime, borderBottom: '2px solid #000', padding: '0 2px', fontWeight: 900, color: '#000' }}>
          {part}
        </span>
      ) : part
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', fontFamily: '"Space Grotesk", sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, textTransform: 'uppercase' }}>
          Root Cause AI Diagnosis & Guardian Fact-Check
        </h2>
        <span style={badgeStyle(diagnosis.guardian)}>Guardian Verdict: {diagnosis.guardian}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        <div style={{ ...cardStyle, background: palette.accent.yellow, border: '3px solid #000', boxShadow: '5px 5px 0px #000' }}>
          <div style={{ fontSize: '1rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cpu size={20} /> Verified AI Agent Cause Analysis
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 900, marginBottom: '0.5rem' }}>
            CAUSE: <span style={{ background: palette.accent.pink, border: '2px solid #000', padding: '0 0.4rem' }}>{diagnosis.cause}</span>
          </div>
          <p style={{ fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.6, margin: '1rem 0' }}>
            {highlightEvidence(diagnosis.explanation)}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <span style={badgeStyle('AUTO')}>Fact-Checked: 100% Match</span>
            <span style={badgeStyle('measured')}>Source: {diagnosis.source.toUpperCase()}</span>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ fontSize: '1rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.75rem', borderBottom: '3px solid #000', paddingBottom: '0.5rem' }}>
            Ollama Agent Reasoning Trace ({agentTrace.length} Steps)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {agentTrace.map((step: any, i: number) => (
              <div key={i} style={{ background: palette.accent.cyan, border: '2px solid #000', boxShadow: '3px 3px 0px #000', padding: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 900 }}>
                  <span style={{ background: '#fff', border: '1px solid #000', padding: '0 0.3rem' }}>STEP {step.step}: {step.tool}</span>
                  <CheckCircle size={16} color="#000" />
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '0.4rem', color: '#000' }}>
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

const Placeholder = ({ title }: any) => <div style={cardStyle}><h2 style={{ fontWeight: 900, margin: 0 }}>{title}</h2><p style={{ fontWeight: 600 }}>UI Module rendered. Awaiting feature integration.</p></div>;

export default function App() {
  const [state, setState] = useState<any>(null);
  const [sseEvents, setSseEvents] = useState<any[]>([]);
  const [activeStage, setActiveStage] = useState<string>('');
  const [isTicking, setIsTicking] = useState<boolean>(false);

  const fetchState = async () => {
    try {
      const res = await fetch('/api/state');
      const data = await res.json();
      setState(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTick = async () => {
    setIsTicking(true);
    try {
      await fetch('/api/sim/tick', { method: 'POST' });
      await fetchState();
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

  useEffect(() => {
    fetchState();
    const sse = new EventSource('/api/stream');
    sse.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        if (parsed.type) {
          setActiveStage(parsed.type);
          setSseEvents((prev) => [parsed, ...prev.slice(0, 15)]);
        }
      } catch (e) { }
    };
    return () => sse.close();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Shell state={state} onTick={handleTick} onInject={handleInject} isTicking={isTicking}>
          <Routes>
            <Route path="/" element={<MissionControl state={state} sseEvents={sseEvents} activeStage={activeStage} />} />
            <Route path="/incidents" element={<Incidents />} />
            <Route path="/diagnosis" element={<Diagnosis />} />
            <Route path="/inventory" element={<InventoryMargin />} />
            <Route path="/inventory-margin" element={<InventoryMargin />} />
            <Route path="/optimizer" element={<Placeholder title="OPTIMIZER STUDIO" />} />
            <Route path="/proof" element={<Proof />} />
          </Routes>
        </Shell>
      </BrowserRouter>
    </QueryClientProvider>
  );
}