import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './theme/ThemeProvider';
import { Shell } from './components/layout/Shell';
import { MissionControl } from './pages/MissionControl';
import DiagnosisPage from './pages/Diagnosis';

// ─── Placeholder pages ─────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '3px solid #000000',
  borderRadius: '0px',
  padding: '1.5rem',
  boxShadow: '5px 5px 0px #000000',
};

const Placeholder = ({ title }: { title: string }) => (
  <div style={cardStyle}>
    <h2 style={{ fontWeight: 900, margin: 0, fontSize: '1.4rem', textTransform: 'uppercase' }}>
      {title}
    </h2>
    <p style={{ fontWeight: 600, marginTop: '0.75rem', color: '#4a4a46' }}>
      UI Module rendered. Awaiting feature integration.
    </p>
  </div>
);

// ─── App Root ─────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Shell>
          <Routes>
            <Route path="/" element={<MissionControl />} />
            <Route path="/incidents" element={<Placeholder title="Incidents Data" />} />
            <Route path="/diagnosis" element={<DiagnosisPage />} />
            <Route path="/inventory" element={<Placeholder title="Inventory Matrix" />} />
            <Route path="/optimizer" element={<Placeholder title="Optimizer Studio" />} />
            <Route path="/proof" element={<Placeholder title="Evaluation Proof" />} />
          </Routes>
        </Shell>
      </BrowserRouter>
    </ThemeProvider>
  );
}
