import React, { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import { palette } from '../../theme/tokens';

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

export interface TimelineDataPoint {
  date: string;
  spend: number;
  roas: number;
  ctr: number;
  days_of_cover?: number;
}

export interface DecoyEvent {
  name: string;
  startDate: string;
  endDate: string;
  type: string;
}

export interface TimelineChartProps {
  incidents: Incident[];
  timeseriesData?: TimelineDataPoint[];
  decoyEvents?: DecoyEvent[];
  onSelectIncident?: (incidentId: string) => void;
}

// Generate realistic 30-day baseline data if none is provided
function generateFallbackTimeseries(incidents: Incident[]): TimelineDataPoint[] {
  const latestDateStr = incidents.length > 0 ? incidents[0].sim_date : '2024-06-16';
  const endDate = new Date(latestDateStr);
  const data: TimelineDataPoint[] = [];

  for (let i = 29; i >= 0; i--) {
    const d = new Date(endDate);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    // Day of week cycle
    const dow = d.getDay();
    const weekendBoost = dow === 0 || dow === 6 ? 1.25 : 1.0;

    // Normal baseline metrics with organic noise
    const seed = Math.sin(i * 1.5) * 0.15;
    const spend = Math.round((420 + seed * 100) * weekendBoost);
    const roas = +(3.2 + seed * 0.8 + (dow === 0 ? 0.4 : 0)).toFixed(2);
    const ctr = +(2.8 + seed * 0.5).toFixed(2);
    const daysOfCover = +(4.5 - (i > 25 ? (i - 25) * 0.6 : 0) + seed * 0.5).toFixed(1);

    data.push({
      date: dateStr,
      spend,
      roas,
      ctr,
      days_of_cover: Math.max(0.5, daysOfCover),
    });
  }

  return data;
}

const DEFAULT_DECOY_EVENTS: DecoyEvent[] = [
  {
    name: 'Memorial Day Weekend',
    startDate: '2024-05-25',
    endDate: '2024-05-27',
    type: 'HOLIDAY',
  },
  {
    name: 'Early Summer Flash Promo',
    startDate: '2024-06-05',
    endDate: '2024-06-07',
    type: 'PLANNED_PROMO',
  },
];

export const TimelineChart: React.FC<TimelineChartProps> = ({
  incidents,
  timeseriesData,
  decoyEvents = DEFAULT_DECOY_EVENTS,
  onSelectIncident,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const seriesData = useMemo(() => {
    if (timeseriesData && timeseriesData.length > 0) {
      return timeseriesData;
    }
    return generateFallbackTimeseries(incidents);
  }, [timeseriesData, incidents]);

  const dates = useMemo(() => seriesData.map((d) => d.date), [seriesData]);

  // Map incidents by date for fast lookup in tooltip and markPoints
  const incidentDateMap = useMemo(() => {
    const map = new Map<string, Incident[]>();
    incidents.forEach((inc) => {
      const existing = map.get(inc.sim_date) || [];
      existing.push(inc);
      map.set(inc.sim_date, existing);
    });
    return map;
  }, [incidents]);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, undefined, {
        renderer: 'canvas',
      });

      chartInstance.current.on('click', (params: any) => {
        if (params.componentType === 'markPoint' || params.seriesName === 'Anomalies') {
          const rawId = params.data?.incidentId;
          if (rawId && onSelectIncident) {
            onSelectIncident(rawId);
          }
        }
      });
    }

    const chart = chartInstance.current;

    // Build markArea for Decoy Events (Holidays / Planned Promos)
    const markAreaPieces = decoyEvents
      .filter((ev) => dates.some((d) => d >= ev.startDate && d <= ev.endDate))
      .map((ev) => [
        {
          name: `DECOY: ${ev.name}`,
          xAxis: ev.startDate,
          itemStyle: {
            color: 'rgba(120, 219, 246, 0.18)',
            borderWidth: 2,
            borderColor: '#78dbf6',
            borderType: 'dashed' as const,
          },
          label: {
            show: true,
            position: 'insideTop' as const,
            formatter: `[DECOY NOISE] ${ev.name}`,
            color: '#000000',
            fontWeight: 'bold',
            fontSize: 10,
            fontFamily: '"Space Grotesk", sans-serif',
          },
        },
        {
          xAxis: ev.endDate,
        },
      ]);

    // Build markPoint data for incidents
    const anomalyMarkPoints: any[] = [];
    incidents.forEach((inc) => {
      if (!dates.includes(inc.sim_date)) return;

      const isCritical = inc.severity >= 150;
      const markerColor = isCritical ? palette.accent.pink : palette.accent.yellow;

      anomalyMarkPoints.push({
        name: inc.id,
        incidentId: inc.id,
        coord: [inc.sim_date, 0],
        value: inc.id,
        symbol: 'pin',
        symbolSize: isCritical ? 44 : 36,
        itemStyle: {
          color: markerColor,
          borderColor: '#000000',
          borderWidth: 2,
          shadowBlur: 0,
        },
        label: {
          show: true,
          formatter: inc.id.replace('INC-', '#'),
          fontSize: 10,
          fontWeight: 900,
          color: '#000000',
          fontFamily: '"Space Grotesk", sans-serif',
        },
      });
    });

    const spendValues = seriesData.map((d) => d.spend);
    const roasValues = seriesData.map((d) => d.roas);
    const ctrValues = seriesData.map((d) => d.ctr);
    const docValues = seriesData.map((d) => d.days_of_cover ?? 0);

    const option: echarts.EChartsOption = {
      backgroundColor: '#ffffff',
      animationDuration: 600,
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          crossStyle: { color: '#000000', width: 2 },
        },
        backgroundColor: '#ffffff',
        borderColor: '#000000',
        borderWidth: 3,
        padding: [12, 16],
        textStyle: {
          color: '#000000',
          fontSize: 12,
          fontFamily: '"Space Grotesk", sans-serif',
        },
        extraCssText: 'box-shadow: 4px 4px 0px #000000; border-radius: 0px;',
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          const dateStr = params[0]?.axisValue;
          const dayIncidents = incidentDateMap.get(dateStr) || [];

          let html = `<div style="font-weight:900;text-transform:uppercase;color:#000;border-bottom:2px solid #000;padding-bottom:4px;margin-bottom:6px">📅 DATE: ${dateStr}</div>`;

          params.forEach((p: any) => {
            if (p.seriesName && !p.seriesName.startsWith('_')) {
              html += `<div style="display:flex;justify-content:space-between;gap:16px;font-size:12px;margin-bottom:2px">
                <span style="font-weight:700">${p.marker} ${p.seriesName}</span>
                <span style="font-weight:900;font-family:monospace">${p.value}</span>
              </div>`;
            }
          });

          if (dayIncidents.length > 0) {
            html += `<div style="margin-top:8px;padding-top:6px;border-top:2px solid #000">`;
            html += `<div style="font-size:11px;font-weight:900;text-transform:uppercase;color:#000;margin-bottom:4px">⚠️ DETECTED ANOMALIES (${dayIncidents.length}):</div>`;
            dayIncidents.forEach((inc) => {
              const bg = inc.severity >= 150 ? palette.accent.pink : palette.accent.yellow;
              html += `<div style="background:${bg};border:2px solid #000;padding:4px 6px;margin-bottom:4px;font-size:11px">
                <strong>[${inc.id}]</strong> ${inc.detector.toUpperCase()} — Drop: <strong>-${inc.magnitude_pct}%</strong> | Sev: <strong>${inc.severity}</strong>
              </div>`;
            });
            html += `</div>`;
          }

          return html;
        },
      },
      legend: {
        data: ['Daily Spend ($)', 'Blended ROAS', 'CTR (%)', 'Days of Cover'],
        top: 8,
        right: 16,
        textStyle: { color: '#000000', fontWeight: 'bold', fontSize: 11, fontFamily: '"Space Grotesk", sans-serif' },
      },
      grid: {
        top: 50,
        left: 55,
        right: 55,
        bottom: 50,
        containLabel: false,
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { lineStyle: { color: '#000000', width: 2 } },
        axisTick: { show: true, lineStyle: { color: '#000000', width: 2 } },
        axisLabel: {
          color: '#000000',
          fontWeight: 'bold',
          fontSize: 10,
          fontFamily: '"Space Grotesk", monospace',
          formatter: (v: string) => v.slice(5),
        },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Spend ($)',
          position: 'left',
          axisLine: { show: true, lineStyle: { color: '#000000', width: 2 } },
          splitLine: { lineStyle: { color: palette.bg.gridLine, type: 'dashed' } },
          axisLabel: { color: '#000000', fontWeight: 'bold', fontSize: 10, formatter: '${value}' },
        },
        {
          type: 'value',
          name: 'ROAS / Ratio',
          position: 'right',
          axisLine: { show: true, lineStyle: { color: '#000000', width: 2 } },
          splitLine: { show: false },
          axisLabel: { color: '#000000', fontWeight: 'bold', fontSize: 10, formatter: '{value}x' },
        },
      ],
      series: [
        {
          name: 'Daily Spend ($)',
          type: 'bar',
          data: spendValues,
          yAxisIndex: 0,
          barMaxWidth: 16,
          itemStyle: {
            color: '#000000',
            borderColor: '#000000',
            borderWidth: 1,
          },
          markArea: {
            silent: true,
            data: markAreaPieces as any,
          },
          markPoint: {
            data: anomalyMarkPoints,
          },
        },
        {
          name: 'Blended ROAS',
          type: 'line',
          data: roasValues,
          yAxisIndex: 1,
          smooth: true,
          lineStyle: { color: '#0284c7', width: 3 },
          itemStyle: { color: '#0284c7', borderColor: '#000', borderWidth: 1 },
          symbol: 'circle',
          symbolSize: 6,
        },
        {
          name: 'CTR (%)',
          type: 'line',
          data: ctrValues,
          yAxisIndex: 1,
          smooth: true,
          lineStyle: { color: '#16a34a', width: 3 },
          itemStyle: { color: '#16a34a', borderColor: '#000', borderWidth: 1 },
          symbol: 'rect',
          symbolSize: 6,
        },
        {
          name: 'Days of Cover',
          type: 'line',
          data: docValues,
          yAxisIndex: 1,
          smooth: true,
          lineStyle: { color: '#d97706', width: 2.5, type: 'dashed' },
          itemStyle: { color: '#ffd23f', borderColor: '#000', borderWidth: 1 },
          symbol: 'triangle',
          symbolSize: 6,
        },
      ],
    };

    chart.setOption(option, true);

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
      chartInstance.current = null;
    };
  }, [seriesData, dates, incidents, decoyEvents, incidentDateMap, onSelectIncident]);

  return (
    <div
      style={{
        background: '#ffffff',
        border: '3px solid #000000',
        boxShadow: '5px 5px 0px #000000',
        padding: '1.25rem',
        width: '100%',
        fontFamily: '"Space Grotesk", sans-serif',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, textTransform: 'uppercase', color: '#000' }}>
              Multichannel Telemetry & Anomaly Timeline
            </h3>
            <span
              style={{
                background: palette.accent.cyan,
                border: '2px solid #000',
                boxShadow: '2px 2px 0px #000',
                padding: '0.15rem 0.5rem',
                fontSize: '0.7rem',
                fontWeight: 900,
                textTransform: 'uppercase',
              }}
            >
              30-Day Window
            </span>
          </div>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', fontWeight: 600, color: '#444' }}>
            Seasonal EWMA baseline telemetry with interactive anomaly pins and suppressed decoy holiday regions.
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', fontSize: '0.75rem', fontWeight: 800 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: palette.accent.pink, border: '2px solid #000', boxShadow: '2px 2px 0px #000', padding: '0.2rem 0.6rem' }}>
            <span style={{ width: 8, height: 8, background: '#000', borderRadius: '50%' }} />
            CRITICAL (|Z| &ge; 2.5, SEV &ge; 150)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: palette.accent.yellow, border: '2px solid #000', boxShadow: '2px 2px 0px #000', padding: '0.2rem 0.6rem' }}>
            <span style={{ width: 8, height: 8, background: '#000', borderRadius: '50%' }} />
            WARNING (SEV &lt; 150)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: palette.accent.cyan, border: '2px solid #000', boxShadow: '2px 2px 0px #000', padding: '0.2rem 0.6rem' }}>
            <span style={{ width: 8, height: 8, border: '1px dashed #000', display: 'inline-block' }} />
            DECOY PERIOD (SUPPRESSED)
          </div>
        </div>
      </div>

      <div ref={chartRef} style={{ width: '100%', height: '360px' }} />
    </div>
  );
};

export default TimelineChart;
