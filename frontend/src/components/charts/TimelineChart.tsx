import React from 'react';
import ReactECharts from 'echarts-for-react';
import { palette } from '../../theme/tokens';

// ─── Scope & Incident interfaces ────────────────────────────────────
export interface Scope {
  platform?: string | null;
  campaign_id?: string | null;
  sku?: string | null;
  creative_id?: string | null;
}

export interface Incident {
  id: string;
  sim_date: string;
  metric: string;
  scope: Scope;
  direction: 'up' | 'down';
  magnitude_pct: number;
  detector: string;
  confidence: number;
  money_at_risk: number;
  severity: number;
  status: 'open' | 'diagnosed' | 'resolved';
}

// ─── Props ───────────────────────────────────────────────────────────
interface TimelineChartProps {
  incidents: Incident[];
  onSelectIncident: (id: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────
const detectorColor: Record<string, string> = {
  creative_fatigue: palette.accent.pink,
  stockout_risk: palette.accent.yellow,
  tracking_break: palette.accent.cyan,
  margin_squeeze: palette.accent.lime,
};

const severityToSize = (sev: number): number => Math.max(12, Math.min(40, sev / 15));

// ─── Component ───────────────────────────────────────────────────────
export const TimelineChart: React.FC<TimelineChartProps> = ({
  incidents,
  onSelectIncident,
}) => {
  // Group unique dates for x-axis
  const dates = Array.from(new Set(incidents.map((inc) => inc.sim_date))).sort();

  // Unique platforms for y-axis categories
  const platforms = Array.from(
    new Set(incidents.map((inc) => inc.scope.platform))
  );

  // Build scatter data: [xIndex, yIndex, severity, incidentId]
  const scatterData = incidents.map((inc) => ({
    value: [
      dates.indexOf(inc.sim_date),
      platforms.indexOf(inc.scope.platform),
      inc.severity,
    ],
    itemStyle: {
      color: detectorColor[inc.detector] || palette.accent.cyan,
      borderColor: '#000',
      borderWidth: 2,
    },
    incident: inc,
  }));

  const option: any = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const inc: Incident = params.data.incident;
        return [
          `<strong>${inc.id}</strong>`,
          `Detector: ${inc.detector}`,
          `Metric: ${inc.metric} (${inc.direction} ${inc.magnitude_pct}%)`,
          `Platform: ${inc.scope.platform}`,
          `Severity: ${inc.severity.toFixed(1)}`,
          `Status: ${inc.status.toUpperCase()}`,
        ].join('<br/>');
      },
      borderColor: '#000',
      borderWidth: 2,
      textStyle: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700 },
    },
    grid: {
      left: '10%',
      right: '5%',
      top: '8%',
      bottom: '12%',
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: '#000', width: 3 } },
      axisTick: { lineStyle: { color: '#000', width: 2 } },
      axisLabel: {
        fontWeight: 900,
        fontSize: 11,
        fontFamily: '"Space Grotesk", sans-serif',
      },
    },
    yAxis: {
      type: 'category',
      data: platforms,
      axisLine: { lineStyle: { color: '#000', width: 3 } },
      axisTick: { lineStyle: { color: '#000', width: 2 } },
      axisLabel: {
        fontWeight: 900,
        fontSize: 11,
        textTransform: 'uppercase',
        fontFamily: '"Space Grotesk", sans-serif',
      },
    },
    series: [
      {
        type: 'scatter',
        data: scatterData,
        symbolSize: (val: number[]) => severityToSize(val[2]),
        emphasis: {
          scale: 1.5,
          itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.4)' },
        },
      },
    ],
  };

  const handleClick = (params: any) => {
    if (params.data?.incident?.id) {
      onSelectIncident(params.data.incident.id);
    }
  };

  return (
    <div
      style={{
        background: palette.bg.card,
        border: '3px solid #000',
        borderRadius: '0px',
        padding: '1.25rem',
        boxShadow: '5px 5px 0px #000',
      }}
    >
      <div
        style={{
          fontWeight: 900,
          fontSize: '1rem',
          textTransform: 'uppercase',
          marginBottom: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>Multichannel Incident Timeline</span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {Object.entries(detectorColor).map(([name, color]) => (
            <span
              key={name}
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '0.15rem 0.5rem',
                background: color,
                border: '2px solid #000',
                boxShadow: '2px 2px 0px #000',
                textTransform: 'uppercase',
              }}
            >
              {name.replace('_', ' ')}
            </span>
          ))}
        </div>
      </div>

      <ReactECharts
        option={option}
        style={{ height: '260px' }}
        onEvents={{ click: handleClick }}
      />
    </div>
  );
};

export default TimelineChart;