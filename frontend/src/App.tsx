import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background: '#0a0d14', color: '#e2e8f0', minHeight: '100vh', fontFamily: 'sans-serif' }}>
    <header style={{ padding: '1rem 2rem', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <h1 style={{ margin: 0, color: '#38bdf8' }}>AdPilot v10</h1>
      <nav style={{ display: 'flex', gap: '1.5rem' }}>
        <Link to="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>Mission Control</Link>
        <Link to="/incidents" style={{ color: '#94a3b8', textDecoration: 'none' }}>Incidents</Link>
        <Link to="/diagnosis" style={{ color: '#94a3b8', textDecoration: 'none' }}>Diagnosis</Link>
        <Link to="/inventory" style={{ color: '#94a3b8', textDecoration: 'none' }}>Inventory ? Margin</Link>
        <Link to="/optimizer" style={{ color: '#94a3b8', textDecoration: 'none' }}>Optimizer Studio</Link>
        <Link to="/proof" style={{ color: '#94a3b8', textDecoration: 'none' }}>Proof</Link>
      </nav>
    </header>
    <main style={{ padding: '2rem' }}>{children}</main>
  </div>
);

const MissionControl = () => <div><h2>Mission Control</h2><p style={{color:'#10b981'}}>AppState: Supervised | Blended ROAS: 4.67 | Status: Healthy</p></div>;
const Incidents = () => <div><h2>Incidents Page</h2><p>INC-001: CREATIVE_FATIGUE (Severity: 312.8)</p></div>;
const Diagnosis = () => <div><h2>Diagnosis Page</h2><p>Cause: CREATIVE_FATIGUE | Guardian: PASS</p></div>;
const InventoryMargin = () => <div><h2>Inventory ? Margin Map</h2><p>SKU-007 (Fix) | SKU-012 (Scale)</p></div>;
const OptimizerStudio = () => <div><h2>Optimizer Studio</h2><p>REC-001 | Opportunity Score: 87</p></div>;
const Proof = () => <div><h2>Proof Page</h2><p>Precision: 0.85 | Recall: 0.92</p></div>;

export default function App() {
  return (
    <BrowserRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<MissionControl />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/diagnosis" element={<Diagnosis />} />
          <Route path="/inventory" element={<InventoryMargin />} />
          <Route path="/optimizer" element={<OptimizerStudio />} />
          <Route path="/proof" element={<Proof />} />
        </Routes>
      </Shell>
    </BrowserRouter>
  );
}
