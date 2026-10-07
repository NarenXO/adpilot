import React, { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';

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

    // Initialize or reuse ECharts instance with dark theme
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, 'dark', {
        renderer: 'canvas',
      });

      // Click handler for incident selection
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
          name: `🛡️ Decoy: ${ev.name}`,
          xAxis: ev.startDate,
          itemStyle: {
            color:
              ev.type.toUpperCase() === 'HOLIDAY'
                ? 'rgba(168, 85, 247, 0.12)' // Purple for holidays
                : 'rgba(56, 189, 248, 0.12)', // Cyan for promos
            borderColor: 'rgba(255, 255, 255, 0.05)',
            borderWidth: 1,
          },
          label: {
            show: true,
            position: 'insideTop',
            distance: 10,
            formatter: `🛡️ Decoy: ${ev.name} (${ev.type})\n[Alerts Suppressed]`,
            color: '#cbd5e1',
            fontSize: 10,
            fontFamily: 'monospace',
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            padding: [4, 8],
            borderRadius: 4,
          },
        },
        {
          xAxis: ev.endDate,
        },
      ]);

    // Build markPoints for Incidents on Spend series
    const markPointData = incidents.map((inc) => {
      const isCritical = inc.severity >= 150;
      const color = isCritical ? '#f43f5e' : '#f59e0b';
      const labelText = isCritical ? 'CRIT' : 'WARN';

      // Find spend value on that date for positioning
      const point = seriesData.find((d) => d.date === inc.sim_date);
      const spendVal = point ? point.spend : 400;

      return {
        name: `${inc.metric} Incident`,
        coord: [inc.sim_date, spendVal],
        value: labelText,
        incidentId: inc.id,
        itemStyle: {
          color,
          shadowBlur: isCritical ? 12 : 6,
          shadowColor: color,
        },
        symbol: isCritical ? 'pin' : 'circle',
        symbolSize: isCritical ? 44 : 32,
      };
    });

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      animationDuration: 600,
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          crossStyle: { color: '#64748b' },
          lineStyle: { color: '#475569', type: 'dashed' },
        },
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        borderColor: 'rgba(148, 163, 184, 0.25)',
        borderWidth: 1,
        padding: [12, 16],
        textStyle: {
          color: '#f8fafc',
          fontSize: 12,
          fontFamily: 'Inter, system-ui, sans-serif',
        },
        extraCssText:
          'backdrop-filter: blur(12px); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5); border-radius: 8px;',
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const dateStr = params[0].axisValue;
          const dayIncidents = incidentDateMap.get(dateStr) || [];
          const activeDecoy = decoyEvents.find(
            (ev) => dateStr >= ev.startDate && dateStr <= ev.endDate
          );

          let html = `<div style="margin-bottom: 8px; font-weight: 600; color: #e2e8f0; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px;">`;
          html += `📅 <span>${dateStr}</span></div>`;

          // Timeseries metric values
          params.forEach((p: any) => {
            if (p.seriesName === 'Anomalies') return;
            const marker = `<span style="display:inline-block;margin-right:6px;border-radius:50%;width:8px;height:8px;background-color:${p.color};"></span>`;
            let valStr = `${p.value}`;
            if (p.seriesName === 'Daily Spend ($)') valStr = `$${Number(p.value).toLocaleString()}`;
            else if (p.seriesName === 'CTR (%)') valStr = `${p.value}%`;
            else if (p.seriesName === 'ROAS') valStr = `${p.value}x`;
            else if (p.seriesName === 'Days of Cover') valStr = `${p.value} days`;

            html += `<div style="display: flex; justify-content: space-between; gap: 16px; margin: 3px 0; font-size: 11px;">`;
            html += `<span>${marker}${p.seriesName}</span><span style="font-family: monospace; font-weight: 600;">${valStr}</span>`;
            html += `</div>`;
          });

          // Decoy banner if active
          if (activeDecoy) {
            html += `<div style="margin-top: 8px; padding: 6px 8px; background: rgba(56, 189, 248, 0.15); border-left: 3px solid #38bdf8; border-radius: 4px; font-size: 11px;">`;
            html += `<div style="font-weight: 600; color: #38bdf8;">🛡️ Decoy Event Active</div>`;
            html += `<div style="color: #94a3b8; font-size: 10px;">${activeDecoy.name} (${activeDecoy.type}) — Alerts Suppressed</div>`;
            html += `</div>`;
          }

          // Incident alerts on this date
          if (dayIncidents.length > 0) {
            html += `<div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.1);">`;
            dayIncidents.forEach((inc) => {
              const isCrit = inc.severity >= 150;
              const badgeColor = isCrit ? '#f43f5e' : '#f59e0b';
              const bg = isCrit ? 'rgba(244, 63, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)';
              html += `<div style="margin-top: 4px; padding: 6px 8px; background: ${bg}; border-left: 3px solid ${badgeColor}; border-radius: 4px; font-size: 11px;">`;
              html += `<div style="font-weight: 700; color: ${badgeColor}; display: flex; justify-content: space-between;">`;
              html += `<span>🚨 ${inc.metric.toUpperCase()} (${inc.detector})</span><span>Sev: ${inc.severity}</span></div>`;
              html += `<div style="color: #cbd5e1; font-size: 10px; margin-top: 2px;">`;
              html += `Risk: <b>$${inc.money_at_risk.toFixed(2)}</b> &bull; Mag: <b>${inc.magnitude_pct.toFixed(1)}% ${inc.direction}</b> &bull; Conf: <b>${(inc.confidence * 100).toFixed(0)}%</b>`;
              html += `</div>`;
              html += `</div>`;
            });
            html += `</div>`;
          }

          return html;
        },
      },
      legend: {
        top: 10,
        right: 20,
        textStyle: { color: '#94a3b8', fontSize: 11 },
        selected: {
          'Daily Spend ($)': true,
          'ROAS': true,
          'CTR (%)': true,
          'Days of Cover': true,
        },
      },
      grid: {
        top: 60,
        left: 55,
        right: 65,
        bottom: 75,
        containLabel: false,
      },
      xAxis: {
        type: 'category',
        data: dates,
        boundaryGap: false,
        axisLine: { lineStyle: { color: '#334155' } },
        axisTick: { alignWithLabel: true, lineStyle: { color: '#334155' } },
        axisLabel: {
          color: '#64748b',
          fontSize: 10,
          formatter: (val: string) => {
            const parts = val.split('-');
            return `${parts[1]}/${parts[2]}`;
          },
        },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Spend ($)',
          nameTextStyle: { color: '#64748b', fontSize: 10, align: 'right' },
          position: 'left',
          axisLine: { show: true, lineStyle: { color: '#334155' } },
          splitLine: {
            lineStyle: { color: 'rgba(51, 65, 85, 0.35)', type: 'dashed' },
          },
          axisLabel: {
            color: '#64748b',
            fontSize: 10,
            formatter: (v: number) => `$${v}`,
          },
        },
        {
          type: 'value',
          name: 'Metrics / Ratio',
          nameTextStyle: { color: '#64748b', fontSize: 10, align: 'left' },
          position: 'right',
          axisLine: { show: true, lineStyle: { color: '#334155' } },
          splitLine: { show: false },
          axisLabel: {
            color: '#64748b',
            fontSize: 10,
          },
        },
      ],
      dataZoom: [
        {
          type: 'slider',
          show: true,
          xAxisIndex: [0],
          bottom: 12,
          height: 22,
          start: 0,
          end: 100,
          borderColor: '#334155',
          fillerColor: 'rgba(56, 189, 248, 0.15)',
          handleStyle: { color: '#38bdf8', borderColor: '#0284c7' },
          textStyle: { color: '#94a3b8', fontSize: 9 },
          brushSelect: true,
        },
        {
          type: 'inside',
          xAxisIndex: [0],
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
        },
      ],
      series: [
        {
          name: 'Daily Spend ($)',
          type: 'line',
          yAxisIndex: 0,
          data: seriesData.map((d) => d.spend),
          smooth: true,
          showSymbol: false,
          itemStyle: { color: '#38bdf8' },
          lineStyle: { width: 2.5, color: '#38bdf8' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(56, 189, 248, 0.28)' },
              { offset: 1, color: 'rgba(56, 189, 248, 0.01)' },
            ]),
          },
          markArea: {
            silent: true,
            data: markAreaPieces as any,
          },
          markPoint: {
            data: markPointData,
          },
        },
        {
          name: 'ROAS',
          type: 'line',
          yAxisIndex: 1,
          data: seriesData.map((d) => d.roas),
          smooth: true,
          showSymbol: false,
          itemStyle: { color: '#10b981' },
          lineStyle: { width: 2, color: '#10b981' },
        },
        {
          name: 'CTR (%)',
          type: 'line',
          yAxisIndex: 1,
          data: seriesData.map((d) => d.ctr),
          smooth: true,
          showSymbol: false,
          itemStyle: { color: '#a855f7' },
          lineStyle: { width: 1.8, color: '#a855f7', type: 'dashed' },
        },
        {
          name: 'Days of Cover',
          type: 'line',
          yAxisIndex: 1,
          data: seriesData.map((d) => d.days_of_cover ?? null),
          smooth: true,
          showSymbol: false,
          itemStyle: { color: '#f59e0b' },
          lineStyle: { width: 1.8, color: '#f59e0b' },
        },
      ],
    };

    chart.setOption(option, true);

    const handleResize = () => {
      chart.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [seriesData, dates, incidents, decoyEvents, incidentDateMap, onSelectIncident]);

  return (
    <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 backdrop-blur-md shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2 px-1">
        <div>
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            Multichannel Performance & Anomaly Timeline
          </h3>
          <p className="text-xs text-slate-400">
            30-day continuous telemetry with automated EWMA seasonality, anomaly markers, and decoy noise suppression.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-md border border-rose-500/20">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Critical (|Z| &gt; 2.5, Sev &ge; 150)
          </div>
          <div className="flex items-center gap-1.5 text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Warning (Sev &lt; 150)
          </div>
          <div className="flex items-center gap-1.5 text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded-md border border-purple-500/20">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            Decoy Period (Suppressed)
          </div>
        </div>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '360px' }} />
    </div>
  );
};

export default TimelineChart;
