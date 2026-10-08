import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { KPICard } from '../components/ui/KPICard';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Badge } from '../components/ui/Badge';
import { RiskGauge } from '../components/ui/RiskGauge';
import { useAppState } from '../context/AppStateContext';

export const MissionControl: React.FC = () => {
  const navigate = useNavigate();
  const { appState, toggleAutonomy, injectAnomaly } = useAppState();

  const [showInjectModal, setShowInjectModal] = useState<boolean>(false);
  const [showDatasetModal, setShowDatasetModal] = useState<boolean>(false);
  const [selectedIncidentType, setSelectedIncidentType] = useState<string>('creative_fatigue');

  const isAutopilot = appState.autonomy_level === 'autopilot';

  const handleInjectIncident = () => {
    injectAnomaly(selectedIncidentType);
    setShowInjectModal(false);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        width: '100%',
        boxSizing: 'border-box',
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
        padding: '2rem'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', color: '#000000', margin: 0 }}>
            Mission Control
          </h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#000000', fontWeight: 600 }}>
            REAL-TIME AD OPERATIONS COMMAND CENTER
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="secondary" size="sm" style={{ backgroundColor: '#ffffff', color: '#000', border: '2px solid #000', boxShadow: '3px 3px 0px #000' }} onClick={() => setShowDatasetModal(true)}>
            🔍 Dataset
          </Button>
          <Button variant="primary" size="sm" style={{ backgroundColor: '#f364cb', color: '#000', border: '2px solid #000', boxShadow: '3px 3px 0px #000' }} onClick={() => setShowInjectModal(true)}>
            ⚡ Inject Anomaly
          </Button>
        </div>
      </div>

      {/* Visual Pipeline Indicator (Closed Loop) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff', padding: '1rem 2rem', border: '3px solid #000', boxShadow: '5px 5px 0px #000' }}>
        {[
          { label: 'SEE', desc: 'Sentinel detects anomaly', color: '#f364cb', stageIndex: 1 },
          { label: 'WHY', desc: 'Investigator finds root cause', color: '#ffd23f', stageIndex: 2 },
          { label: 'DECIDE', desc: 'Strategist reallocates budget', color: '#78dbf6', stageIndex: 3 },
          { label: 'PROVE', desc: 'Learner verifies ROI lift', color: '#82e66f', stageIndex: 4 }
        ].map((stage, i) => {
          const isActive = appState.pipeline_stage === stage.stageIndex;
          return (
            <React.Fragment key={stage.label}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', flex: 1, opacity: isActive ? 1 : 0.4 }}>
                <div style={{ padding: '0.25rem 1rem', backgroundColor: stage.color, border: '2px solid #000', fontWeight: 800, fontSize: '0.875rem', boxShadow: isActive ? '3px 3px 0 #000' : 'none' }}>
                  {i + 1}. {stage.label}
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#000' }}>{stage.desc}</span>
              </div>
              {i < 3 && <div style={{ height: '4px', width: '40px', backgroundColor: '#000', opacity: 0.4 }} />}
            </React.Fragment>
          );
        })}
      </div>

      {/* Brutalist AI Explanation */}
      <div style={{ backgroundColor: '#ffffff', border: '3px solid #000', boxShadow: '5px 5px 0px #000', padding: '1.25rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase' }}>
          🧠 AI Operations Brief ({appState.sim_date})
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {appState.daily_explanation.map((exp, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <span style={{ backgroundColor: exp.color, border: '2px solid #000', padding: '0.1rem 0.5rem', fontSize: '0.75rem', fontWeight: 800 }}>
                {exp.title}
              </span>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, marginTop: '0.1rem' }}>{exp.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Row 1: 4-up KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
        {appState.kpis.map((kpi) => (
          <KPICard key={kpi.label} label={kpi.label} value={kpi.value} unit={kpi.unit} deltaPct={kpi.delta_pct} sparklineData={kpi.sparkline} />
        ))}
      </div>

      {/* Row 2: Autonomy | Agent Feed | Active Incidents */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        <Card title="Autonomy Level">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <StatusBadge status={isAutopilot ? 'safe' : 'warning'} pulse>
                {isAutopilot ? 'Autopilot' : 'Supervised'}
              </StatusBadge>
            </div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#000000', lineHeight: 1.55, fontWeight: 500 }}>
              {isAutopilot
                ? <><strong style={{ backgroundColor: '#82e66f', padding: '0 4px', border: '1px solid #000' }}>Autopilot</strong> active. Agent executes actions within risk budget.</>
                : <><strong style={{ backgroundColor: '#ffd23f', padding: '0 4px', border: '1px solid #000' }}>Supervised</strong> active. Human approval required.</>
              }
            </p>
            <RiskGauge usedPct={appState.risk_budget.used_pct} capPct={appState.risk_budget.cap_pct} size={150} label="Spend at Risk" />
            <Button variant={isAutopilot ? 'secondary' : 'primary'} size="sm" onClick={toggleAutonomy}>
              Switch to {isAutopilot ? 'Supervised' : 'Autopilot'}
            </Button>
          </div>
        </Card>

        <Card title="Live Agent Feed">
          <div style={{ backgroundColor: '#111', color: '#00ff66', fontFamily: 'monospace', padding: '1rem', border: '2px solid #000', height: '280px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.75rem' }}>
              {appState.agent_feed.map((ev, idx) => (
                <div key={idx} style={{ opacity: idx === 0 ? 1 : 0.7 }}>
                  <span style={{ color: '#888' }}>[{ev.ts}]</span>
                  <span style={{ color: '#78dbf6', fontWeight: 'bold', margin: '0 0.5rem' }}>[{ev.module.toUpperCase()}]</span>
                  <span style={{ color: ev.severity === 'danger' ? '#f364cb' : ev.severity === 'warning' ? '#ffd23f' : ev.severity === 'success' ? '#82e66f' : '#00ff66' }}>
                    {ev.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Anomaly Radar" action={<Badge variant="warning">{appState.active_incidents.length} OPEN</Badge>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
            {appState.active_incidents.map((inc) => (
              <div
                key={inc.id}
                onClick={() => navigate('/diagnosis')}
                style={{
                  display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: '0.5rem',
                  padding: '0.625rem', backgroundColor: '#ffffff', border: '2px solid #000000', boxShadow: '3px 3px 0px #000000',
                  cursor: 'pointer'
                }}
              >
                <span style={{ width: '12px', height: '12px', backgroundColor: inc.severity === 'critical' ? '#f364cb' : inc.severity === 'medium' ? '#ffd23f' : '#78dbf6', border: '1.5px solid #000' }} />
                <span style={{ fontSize: '0.8125rem' }}>
                  <span style={{ fontWeight: 800 }}>{inc.metric}</span>
                  <span style={{ marginLeft: '0.35rem', fontWeight: 600 }}>{inc.scope}</span>
                </span>
                <span style={{ fontSize: '0.6875rem', fontWeight: 800, padding: '0.1rem 0.4rem', border: '1.5px solid #000', backgroundColor: inc.direction === 'down' ? '#f364cb' : '#82e66f' }}>
                  {inc.direction === 'up' ? '+' : ''}{inc.magnitude_pct.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {showDatasetModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', border: '3px solid #000', boxShadow: '8px 8px 0px #000', padding: '1.5rem', width: '100%', maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, textTransform: 'uppercase' }}>DuckDB Ground Truth Dataset</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowDatasetModal(false)}>✕ Close</Button>
            </div>
            <pre style={{ backgroundColor: '#f3f3ed', border: '2px solid #000', padding: '1rem', overflowX: 'auto', fontSize: '0.75rem', fontWeight: 700, maxHeight: '300px', overflowY: 'auto' }}>
              {JSON.stringify(appState, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {showInjectModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', border: '3px solid #000000', boxShadow: '8px 8px 0px #000000', padding: '1.75rem', maxWidth: '440px', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, textTransform: 'uppercase' }}>Inject Synthetic Anomaly</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {['creative_fatigue', 'stockout', 'tracking_break', 'margin_squeeze'].map((t) => (
                <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', backgroundColor: selectedIncidentType === t ? '#78dbf6' : '#ffffff', border: '2px solid #000000', boxShadow: selectedIncidentType === t ? '3px 3px 0px #000000' : 'none', cursor: 'pointer' }}>
                  <input type="radio" name="injectType" value={t} checked={selectedIncidentType === t} onChange={() => setSelectedIncidentType(t)} style={{ accentColor: '#000' }} />
                  <div style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.875rem' }}>{t.replace('_', ' ')}</div>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="ghost" size="sm" onClick={() => setShowInjectModal(false)}>Cancel</Button>
              <Button variant="primary" size="sm" style={{ backgroundColor: '#f364cb', border: '2px solid #000', color: '#000' }} onClick={handleInjectIncident}>Confirm Inject</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MissionControl;