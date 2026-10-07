import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import { Activity, AlertTriangle, ShieldCheck, PieChart, Sliders, Award, Play, Pause, Zap, Power, Smile } from 'lucide-react';
import { palette } from './theme/tokens';

const cardStyle: React.CSSProperties = {
  background: palette.bg.card, border: `3px solid ${palette.bg.border}`,
  borderRadius: '0px', padding: '1.25rem', boxShadow: `5px 5px 0px ${palette.bg.shadow}`,
};

const badgeStyle = (type: string): React.CSSProperties => {
  const colors: any = {
    measured: { bg: palette.accent.cyan, color: '#000' }, derived: { bg: palette.accent.pink, color: '#000' },
    scenario: { bg: palette.accent.yellow, color: '#000' }, AUTO: { bg: palette.accent.lime, color: '#000' },
    BLOCK: { bg: palette.accent.pink, color: '#000' },
  };
  const conf = colors[type] || colors.measured;
  return {
    fontSize: '0.75rem', fontWeight: 900, padding: '0.2rem 0.6rem', background: conf.bg,
    color: conf.color, border: '2px solid #000', boxShadow: '2px 2px 0px #000', textTransform: 'uppercase'
  };
};

const Shell = ({ children, state, onTick }: any) => {
  const location = useLocation();
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let interval: any;
    if (isPlaying) { interval = setInterval(() => { onTick(); }, 2500); }
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div style={{ minHeight: '100vh', background: palette.bg.base, backgroundImage: `linear-gradient(${palette.bg.gridLine} 1px, transparent 1px), linear-gradient(90deg, ${palette.bg.gridLine} 1px, transparent 1px)`, backgroundSize: '24px 24px', color: '#000', display: 'flex', flexDirection: 'column', fontFamily: '"Space Grotesk", sans-serif' }}>
      <header style={{ borderBottom: '3px solid #000', padding: '0.85rem 2rem', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ width: '42px', height: '42px', background: palette.accent.yellow, border: '3px solid #000', boxShadow: '3px 3px 0px #000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Smile size={24} color="#000" /></div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', color: '#000' }}>AdPilot</h1>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#333' }}>D2C DECISION ENGINE</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: '#fff', padding: '0.35rem 0.8rem', border: '3px solid #000', boxShadow: '3px 3px 0px #000' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>DATE:</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 900, background: palette.accent.cyan, padding: '0.1rem 0.4rem', border: '1px solid #000' }}>{state?.sim_date || '2024-06-15'}</span>
            <button onClick={() => setIsPlaying(!isPlaying)} style={{ background: isPlaying ? palette.accent.pink : palette.accent.lime, border: '3px solid #000', fontWeight: 900, padding: '0.2rem 0.6rem', cursor: 'pointer', boxShadow: '2px 2px 0px #000' }}>{isPlaying ? 'PAUSE' : 'PLAY'}</button>
            <button onClick={onTick} style={{ background: '#fff', border: '3px solid #000', fontWeight: 900, padding: '0.2rem 0.6rem', cursor: 'pointer', boxShadow: '2px 2px 0px #000' }}>+1 DAY</button>
          </div>
        </div>
      </header>
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

const MissionControl = ({ state, sseEvents }: any) => {
  const kpis = state?.kpis || { total_spend: 12450, total_revenue: 58200, blended_roas: 4.67, total_profit: 18340 };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
          <div style={{ fontWeight: 900, fontSize: '0.8rem' }}>PROFIT</div>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, margin: '0.5rem 0' }}>${Math.round(kpis.total_profit).toLocaleString()}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem' }}>
        <div style={cardStyle}>
          <div style={{ fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', borderBottom: '3px solid #000', paddingBottom: '0.75rem', marginBottom: '1rem' }}>LIVE ENGINE TRACE</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '320px', overflowY: 'auto' }}>
            {sseEvents.length === 0 ? <div style={{fontWeight: 700}}>Awaiting execution tick...</div> : sseEvents.map((ev: any, idx: number) => (
              <div key={idx} style={{ background: '#fff', border: '2px solid #000', boxShadow: '2px 2px 0px #000', padding: '0.75rem', fontWeight: 700 }}>
                <span style={{ background: palette.accent.cyan, border: '1px solid #000', padding: '0 0.3rem', marginRight: '0.5rem' }}>{ev.type}</span>
                {JSON.stringify(ev.payload).slice(0,80)}
              </div>
            ))}
          </div>
        </div>
        <div style={cardStyle}>
            <div style={{ fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', borderBottom: '3px solid #000', paddingBottom: '0.75rem', marginBottom: '1rem' }}>SYSTEM STATUS</div>
            <div style={{fontWeight: 900, fontSize: '1.2rem'}}>RISK BUDGET: <span style={{color: palette.accent.pink}}>{state?.risk_budget?.used_pct || 4.2}%</span></div>
            <div style={{marginTop: '1rem', fontWeight: 900, fontSize: '1.2rem'}}>ANOMALIES: 2 OPEN</div>
        </div>
      </div>
    </div>
  );
};

const Placeholder = ({ title }: any) => <div style={cardStyle}><h2 style={{fontWeight:900, margin:0}}>{title}</h2><p style={{fontWeight:600}}>UI Module rendered. Awaiting feature integration.</p></div>;

export default function App() {
  const [state, setState] = useState<any>(null);
  const [sseEvents, setSseEvents] = useState<any[]>([]);

  const fetchState = async () => { const res = await fetch('/api/state'); setState(await res.json()); };
  const handleTick = async () => { await fetch('/api/sim/tick', { method: 'POST' }); fetchState(); };

  useEffect(() => {
    fetchState();
    const sse = new EventSource('/api/stream');
    sse.onmessage = (e) => {
      try { setSseEvents((prev) => [JSON.parse(e.data), ...prev.slice(0, 15)]); } catch {}
    };
    return () => sse.close();
  }, []);

  return (
    <BrowserRouter>
      <Shell state={state} onTick={handleTick}>
        <Routes>
          <Route path="/" element={<MissionControl state={state} sseEvents={sseEvents} onTick={handleTick} />} />
          <Route path="/incidents" element={<Placeholder title="INCIDENTS DATA" />} />
          <Route path="/diagnosis" element={<Placeholder title="DIAGNOSIS ENGINE" />} />
          <Route path="/inventory" element={<Placeholder title="INVENTORY MATRIX" />} />
          <Route path="/optimizer" element={<Placeholder title="OPTIMIZER STUDIO" />} />
          <Route path="/proof" element={<Placeholder title="EVALUATION PROOF" />} />
        </Routes>
      </Shell>
    </BrowserRouter>
  );
}
