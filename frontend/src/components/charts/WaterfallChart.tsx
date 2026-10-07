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

// ─── Color map (Invente '26 Neo-Brutalist) ───────────────────────────────────

const TYPE_COLORS: Record<WaterfallStep['type'], string> = {
  base:     '#78dbf6', // cyan
  positive: '#82e66f', // lime
  negative: '#f364cb', // pink
  total:    '#ffd23f', // yellow
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
      } else if (step.type === 'positive') {
        bases.push(runningTotal);
        values.push(step.value);
        runningTotal += step.value;
      } else {
        runningTotal += step.value;
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
        backgroundColor: '#ffffff',
        borderColor: '#000000',
        borderWidth: 2,
        extraCssText: 'box-shadow: 3px 3px 0px #000000; font-family: Space Grotesk, sans-serif; color: #000000; font-weight: 600;',
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
              <div style="font-weight:700;color:#000000;margin-bottom:4px">${step.label}</div>
              <div style="color:#000000;background-color:${TYPE_COLORS[step.type]};padding:2px 6px;border:1px solid #000;font-size:13px;font-weight:700;display:inline-block">${sign}${formatFull(step.value)}</div>
            </div>
          `;
        },
      },
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: {
          color: '#000000',
          fontSize: 11,
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 600,
          rotate: 0,
          interval: 0,
        },
        axisLine: { lineStyle: { color: '#000000', width: 2 } },
        axisTick: { show: false },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: '#000000',
          fontSize: 11,
          fontFamily: "'Space Grotesk', monospace",
          fontWeight: 600,
          formatter: (v: number) => formatKM(v),
        },
        axisLine: { lineStyle: { color: '#000000', width: 2 } },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#e1e1d8', type: 'dashed' } },
      },
      series: [
        {
          name: 'base',
          type: 'bar',
          stack: 'waterfall',
          silent: true,
          itemStyle: { color: 'transparent', borderColor: 'transparent' },
          data: bases,
          animation: false,
        },
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
            color: '#000000',
            fontFamily: "'Space Grotesk', monospace",
            fontSize: 11,
            fontWeight: 700,
          },
          itemStyle: {
            color: (params: Record<string, unknown>) =>
              itemColors[params.dataIndex as number] ?? '#e1e1d8',
            borderColor: '#000000',
            borderWidth: 2,
            borderRadius: 0,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 0,
              borderColor: '#000000',
              borderWidth: 3,
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
