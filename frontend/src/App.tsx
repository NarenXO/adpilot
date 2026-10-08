import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { palette } from './theme/tokens';

import MissionControl from './pages/MissionControl';
import Diagnosis from './pages/Diagnosis';
import OptimizerStudio from './pages/OptimizerStudio';
import InventoryMargin from './pages/InventoryMargin';
import Incidents from './pages/Incidents';
import Proof from './pages/Proof';

const queryClient = new QueryClient();

function Navigation() {
  const location = useLocation();
  
  return (
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
  );
}

export default function App() {
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
          
          {/* SYSTEM ACTIVE INDICATOR */}
          <div style={{
            background: palette?.accent?.lime || '#82e66f',
            borderBottom: '3px solid #000',
            padding: '0.5rem',
            textAlign: 'center',
            fontWeight: 900,
            textTransform: 'uppercase',
            fontSize: '1rem',
            letterSpacing: '1px'
          }}>
            SYSTEM ACTIVE v10
          </div>

          {/* NAVIGATION BAR */}
          <Navigation />

          <main style={{ flex: 1, padding: '2rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
            <Routes>
              <Route path="/" element={<MissionControl />} />
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