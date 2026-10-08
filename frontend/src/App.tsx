import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppStateProvider } from './context/AppStateContext';
import { TopBar } from './components/layout/TopBar';
import MissionControl from './pages/MissionControl';
import Diagnosis from './pages/Diagnosis';
import OptimizerStudio from './pages/OptimizerStudio';
import InventoryMargin from './pages/InventoryMargin';
import Incidents from './pages/Incidents';
import Proof from './pages/Proof';

export default function App() {
  return (
    <AppStateProvider>
      <BrowserRouter>
        <div style={{ minHeight: '100vh', background: '#f3f3ed', fontFamily: "'Space Grotesk', sans-serif" }}>
          <div style={{ background: '#000', color: '#82e66f', textAlign: 'center', padding: 4, fontWeight: 800, fontSize: 12 }}>
            SYSTEM ACTIVE v10 — AUTONOMOUS D2C ENGINE
          </div>
          <TopBar />
          <nav style={{ display: 'flex', gap: 8, padding: '8px 16px', background: '#fff', borderBottom: '2px solid #000', flexWrap: 'wrap' }}>
            {[
              ['/', 'CONTROL'],
              ['/incidents', 'INCIDENTS'],
              ['/diagnosis', 'DIAGNOSIS'],
              ['/inventory', 'INVENTORY'],
              ['/optimizer', 'OPTIMIZER'],
              ['/proof', 'PROOF'],
            ].map(([to, label]) => (
              <a key={to} href={to} style={{ padding: '6px 12px', border: '2px solid #000', fontWeight: 800, textDecoration: 'none', color: '#000', background: '#ffd23f' }}>{label}</a>
            ))}
          </nav>
          <Routes>
            <Route path="/" element={<MissionControl />} />
            <Route path="/incidents" element={<Incidents />} />
            <Route path="/diagnosis" element={<Diagnosis />} />
            <Route path="/diagnosis/:id" element={<Diagnosis />} />
            <Route path="/inventory" element={<InventoryMargin />} />
            <Route path="/optimizer" element={<OptimizerStudio />} />
            <Route path="/proof" element={<Proof />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AppStateProvider>
  );
}