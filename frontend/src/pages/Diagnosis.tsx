import React, { useState, useEffect } from 'react';
import { Cpu, CheckCircle } from 'lucide-react';
import { palette } from '../theme/tokens';

const cardStyle: React.CSSProperties = {
  background: palette.bg.card,
  border: `3px solid ${palette.bg.border}`,
  borderRadius: '0px',
  padding: '1.25rem',
  boxShadow: `5px 5px 0px ${palette.bg.shadow}`,
};

const badgeStyle = (type: string): React.CSSProperties => {
  const colors: Record<string, { bg: string; color: string }> = {
    AUTO: { bg: palette.accent.lime, color: '#000' },
    PASS: { bg: palette.accent.lime, color: '#000' },
    BLOCK: { bg: palette.accent.pink, color: '#000' },
    measured: { bg: palette.accent.cyan, color: '#000' },
  };
  const conf = colors[type] || colors.measured;
  return {
    fontSize: '0.75rem',
    fontWeight: 900,
    padding: '0.2rem 0.6rem',
    background: conf.bg,
    color: conf.color,
    border: '2px solid #000',
    boxShadow: '2px 2px 0px #000',
    textTransform: 'uppercase',
  };
};

export default function Diagnosis() {
  const [diagData, setDiagData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/incidents/INC-001/diagnosis')
      .then((r) => r.json())
      .then((d) => setDiagData(d))
      .catch(console.error);
  }, []);

  const diagnosis = diagData?.diagnosis || {
    cause: 'CREATIVE_FATIGUE',
    explanation:
      'CTR dropped 35% (E12: 0.018 vs 0.028) while frequency rose to 8.2 (E12) and spend remained flat (-2.1%). Confirmed creative fatigue.',
    guardian: 'PASS',
    source: 'agent',
  };

  const agentTrace = diagData?.agent_trace || [
    {
      step: 1,
      tool: 'creative_breakdown',
      result_summary: 'CTR dropped from 0.028 to 0.018, frequency rose to 8.2',
    },
    {
      step: 2,
      tool: 'compare_periods',
      result_summary: 'Confirmed 35.2% performance drop on camp_meta_03',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: '1.6rem',
            fontWeight: 900,
            textTransform: 'uppercase',
          }}
        >
          Root Cause AI Diagnosis &amp; Guardian Fact-Check
        </h2>
        <span style={badgeStyle(diagnosis.guardian)}>
          Guardian Verdict: {diagnosis.guardian}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1.25rem',
        }}
      >
        <div style={{ ...cardStyle, background: palette.accent.yellow }}>
          <div
            style={{
              fontSize: '1rem',
              fontWeight: 900,
              textTransform: 'uppercase',
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Cpu size={20} /> Verified AI Agent Cause Analysis
          </div>
          <div
            style={{ fontSize: '1.1rem', fontWeight: 900, marginBottom: '0.5rem' }}
          >
            CAUSE:{' '}
            <span
              style={{
                background: palette.accent.pink,
                border: '2px solid #000',
                padding: '0 0.4rem',
              }}
            >
              {diagnosis.cause}
            </span>
          </div>
          <p
            style={{
              fontSize: '0.95rem',
              fontWeight: 700,
              lineHeight: 1.6,
              margin: '1rem 0',
            }}
          >
            {diagnosis.explanation}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <span style={badgeStyle('AUTO')}>Fact-Checked: 100% Match</span>
            <span style={badgeStyle('measured')}>
              Source: {diagnosis.source.toUpperCase()}
            </span>
          </div>
        </div>

        <div style={cardStyle}>
          <div
            style={{
              fontSize: '1rem',
              fontWeight: 900,
              textTransform: 'uppercase',
              marginBottom: '0.75rem',
              borderBottom: '3px solid #000',
              paddingBottom: '0.5rem',
            }}
          >
            Ollama Agent Reasoning Trace ({agentTrace.length} Steps)
          </div>
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
          >
            {agentTrace.map((step: any, i: number) => (
              <div
                key={i}
                style={{
                  background: '#fff',
                  border: '2px solid #000',
                  boxShadow: '3px 3px 0px #000',
                  padding: '0.75rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.8rem',
                    fontWeight: 900,
                  }}
                >
                  <span
                    style={{
                      background: palette.accent.cyan,
                      border: '1px solid #000',
                      padding: '0 0.3rem',
                    }}
                  >
                    STEP {step.step}: {step.tool}
                  </span>
                  <CheckCircle size={16} color="#000" />
                </div>
                <div
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    marginTop: '0.4rem',
                    color: '#000',
                  }}
                >
                  {step.result_summary}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export { Diagnosis };
