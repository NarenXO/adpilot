import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { EmptyState } from '../ui/EmptyState';

// ─── Contract type (mirrored locally) ────────────────────────────────────────

export interface WaterfallStep {
  label: string;
  value: number;
  type: 'base' | 'positive' | 'negative' | 'total';
}

// ─── Mock data ────────────────────────────────────────────────────────────────

export const MOCK_WATERFALL: WaterfallStep[] = [
  { label: 'Base Revenue',     value: 142800, type: 'base' },
  { label: 'Spend Impact',     value: -48230, type: 'negative' },
  { label: 'CVR Uplift',       value: +12400, type: 'positive' },
  { label: 'Margin Squeeze',   value: -8600,  type: 'negative' },
  { label: 'Creative Fatigue', value: -5200,  type: 'negative' },
  { label: 'Net Profit',       value: 93170,  type: 'total' },
];

// ─── Color map ────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<WaterfallStep['type'], string> = {
  base:     '#38bdf8', // cyan
  positive: '#10b981', // green
  negative: '#ef4444', // red
  total:    '#f59e0b', // amber
};

// ─── Formatting helpers ───────────────────────────────────────────────────────

const formatKM = (v: number): string => {
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toLocaleString()}`;
};

const formatFull = (v: number): string =>
  `$${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 0 })}`;

// ─── Component ────────────────────────────────────────────────────────────────

export interface WaterfallChartProps {
  data?: WaterfallStep[];
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const WaterfallChart: React.FC<WaterfallChartProps> = ({
  data = MOCK_WATERFALL,
  height = 360,
  className = '',
  style,
}) => {
  const option = useMemo(() => {
    if (!data || data.length === 0) return null;

    // Build floating-bar series. ECharts waterfall uses a transparent "base"
    // bar stacked under the visible bar to create the floating effect.
    //
    // For each step, track a running "floor" — the bottom of the visible bar.
    let runningTotal = 0;
    const bases: number[]    = [];
    const values: number[]   = [];
    const itemColors: string[] = [];

    data.forEach((step) => {
      if (step.type === 'base') {
        bases.push(0);
        values.push(step.value);
        runningTotal = step.value;
      } else if (step.type === 'total') {
        bases.push(0);
        values.push(step.value);
        // Don't accumulate; total shows absolute
      } else if (step.type === 'positive') {
        bases.push(runningTotal);
        values.push(step.value);
        runningTotal += step.value;
      } else {
        // negative
        runningTotal += step.value; // step.value is already negative
        bases.push(runningTotal);
        values.push(Math.abs(step.value));
      }
      itemColors.push(TYPE_COLORS[step.type]);
    });

    const labels = data.map((d) => d.label);

    return {
      backgroundColor: 'transparent',
      grid: {
        top: 40,
        bottom: 60,
        left: 64,
        right: 24,
        containLabel: false,
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: '#334155',
        borderWidth: 1,
        textStyle: { color: '#e2e8f0', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 },
        formatter: (params: Record<string, unknown>[]) => {
          const visibleBar = (params as Record<string, unknown>[]).find(
            (p) => (p as Record<string, unknown>).seriesName === 'value'
          );
          if (!visibleBar) return '';
          const idx = visibleBar.dataIndex as number;
          const step = data[idx];
          const sign = step.type === 'negative' ? '-' : '';
          return `
            <div style="padding:4px 2px">
              <div style="font-weight:700;color:#f8fafc;margin-bottom:4px">${step.label}</div>
              <div style="color:${TYPE_COLORS[step.type]};font-size:13px">${sign}${formatFull(step.value)}</div>
            </div>
          `;
        },
      },
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: {
          color: '#94a3b8',
          fontSize: 11,
          fontFamily: 'Inter, sans-serif',
          rotate: 0,
          interval: 0,
        },
        axisLine: { lineStyle: { color: '#334155' } },
        axisTick: { show: false },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: '#94a3b8',
          fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
          formatter: (v: number) => formatKM(v),
        },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
      },
      series: [
        // Invisible base bars (transparent stack layer)
        {
          name: 'base',
          type: 'bar',
          stack: 'waterfall',
          silent: true,
          itemStyle: { color: 'transparent', borderColor: 'transparent' },
          data: bases,
          animation: false,
        },
        // Visible colored bars
        {
          name: 'value',
          type: 'bar',
          stack: 'waterfall',
          barWidth: '52%',
          label: {
            show: true,
            position: 'top',
            formatter: (params: Record<string, unknown>) => {
              const step = data[params.dataIndex as number];
              const sign = step.type === 'negative' ? '-' : '';
              return `${sign}${formatKM(step.value)}`;
            },
            color: '#e2e8f0',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            fontWeight: 600,
          },
          itemStyle: {
            color: (params: Record<string, unknown>) =>
              itemColors[params.dataIndex as number] ?? '#94a3b8',
            borderRadius: [3, 3, 0, 0],
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 12,
              shadowColor: 'rgba(255,255,255,0.15)',
            },
          },
          data: values,
        },
      ],
    };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="No waterfall data"
        description="Revenue attribution data will appear here once a simulation is run."
        style={{ minHeight: height }}
      />
    );
  }

  return (
    <div
      className={`adpilot-waterfall-chart ${className}`.trim()}
      style={{ width: '100%', ...style }}
      aria-label="Profit waterfall chart showing revenue attribution breakdown"
    >
      <ReactECharts
        option={option ?? {}}
        style={{ width: '100%', height }}
        opts={{ renderer: 'svg' }}
        notMerge
        lazyUpdate={false}
      />
    </div>
  );
};

export default WaterfallChart;
