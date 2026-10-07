import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { EmptyState } from '../ui/EmptyState';

// ─── Contract type (mirrored locally) ────────────────────────────────────────

export interface HeatmapCell {
  campaign: string;
  day: string;
  value: number;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_CAMPAIGNS = [
  'camp_meta_01',
  'camp_meta_03',
  'camp_meta_05',
  'camp_google_02',
  'camp_google_07',
  'camp_tiktok_02',
];

const MOCK_DAYS: string[] = Array.from({ length: 14 }, (_, i) => {
  const d = new Date(2024, 5, i + 2); // Jun 2–15
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
});

// Deterministic ROAS values per campaign per day:
// camp_meta_03 → downward fatigue trend (starts ~3.2, ends ~1.4)
// camp_meta_05 → upward winner trend   (starts ~2.1, ends ~3.8)
// Others       → relatively flat ± noise
const BASE_ROAS: Record<string, number> = {
  camp_meta_01:   2.8,
  camp_meta_03:   3.2,
  camp_meta_05:   2.1,
  camp_google_02: 3.1,
  camp_google_07: 2.5,
  camp_tiktok_02: 2.0,
};

const TRENDS: Record<string, number> = {
  camp_meta_01:   -0.02,  // near-flat slight decline
  camp_meta_03:   -0.13,  // strong creative fatigue
  camp_meta_05:   +0.12,  // new winner rising
  camp_google_02: +0.01,  // stable
  camp_google_07: -0.07,  // moderate decline
  camp_tiktok_02: +0.04,  // slight improvement
};

// Small deterministic noise values per (campaign, day) index
const NOISE_SEED = [
  [+0.1, -0.05, +0.12, -0.08, +0.04, -0.02, +0.09, -0.11, +0.06, -0.03, +0.08, -0.06, +0.05, -0.04],
  [-0.05, +0.09, -0.04, +0.06, -0.08, +0.02, -0.07, +0.05, -0.11, +0.08, -0.03, +0.09, -0.06, +0.04],
  [+0.08, -0.03, +0.06, -0.09, +0.12, -0.05, +0.07, -0.04, +0.09, -0.06, +0.11, -0.08, +0.05, -0.03],
  [-0.04, +0.07, -0.09, +0.03, -0.06, +0.11, -0.04, +0.08, -0.05, +0.06, -0.09, +0.04, -0.07, +0.05],
  [+0.06, -0.08, +0.04, -0.07, +0.09, -0.03, +0.06, -0.09, +0.04, -0.06, +0.08, -0.04, +0.07, -0.05],
  [-0.03, +0.06, -0.08, +0.05, -0.04, +0.09, -0.06, +0.03, -0.07, +0.05, -0.03, +0.08, -0.05, +0.06],
];

export const MOCK_HEATMAP: HeatmapCell[] = MOCK_CAMPAIGNS.flatMap((campaign, ci) =>
  MOCK_DAYS.map((day, di) => {
    const base  = BASE_ROAS[campaign] ?? 2.5;
    const trend = TRENDS[campaign] ?? 0;
    const noise = NOISE_SEED[ci]?.[di] ?? 0;
    const raw   = base + trend * di + noise;
    return {
      campaign,
      day,
      value: Math.max(0.5, parseFloat(raw.toFixed(2))),
    };
  })
);

// ─── Component ────────────────────────────────────────────────────────────────

export interface HeatmapChartProps {
  data?: HeatmapCell[];
  campaigns?: string[];
  days?: string[];
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const HeatmapChart: React.FC<HeatmapChartProps> = ({
  data = MOCK_HEATMAP,
  campaigns = MOCK_CAMPAIGNS,
  days = MOCK_DAYS,
  height = 320,
  className = '',
  style,
}) => {
  const option = useMemo(() => {
    if (!data || data.length === 0) return null;

    // Build flat [dayIndex, campaignIndex, value] triplets for ECharts heatmap
    const echartsData: [number, number, number][] = data.map((cell) => {
      const dayIdx = days.indexOf(cell.day);
      const campIdx = campaigns.indexOf(cell.campaign);
      return [dayIdx, campIdx, cell.value];
    });

    // ROAS min/max for color scale
    const values = data.map((c) => c.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);

    // Index of fatigue campaign for markArea highlight
    const fatigueIdx = campaigns.indexOf('camp_meta_03');

    return {
      backgroundColor: 'transparent',
      grid: {
        top: 20,
        bottom: 60,
        left: 120,
        right: 80,
        containLabel: false,
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: '#ffffff',
        borderColor: '#000000',
        borderWidth: 2,
        extraCssText: 'box-shadow: 3px 3px 0px #000000; font-family: Space Grotesk, sans-serif; color: #000000; font-weight: 600;',
        formatter: (params: Record<string, unknown>) => {
          const val = params.data as [number, number, number];
          const dayLabel  = days[val[0]]  ?? '—';
          const campLabel = campaigns[val[1]] ?? '—';
          const roas      = val[2].toFixed(1);
          return `
            <div style="padding:4px 2px">
              <div style="font-weight:700;color:#000000;margin-bottom:3px">${campLabel}</div>
              <div style="color:#4a4a46;font-weight:600">${dayLabel}</div>
              <div style="color:#000000;background-color:#78dbf6;padding:2px 6px;border:1px solid #000;font-weight:700;font-size:13px;margin-top:3px;display:inline-block">ROAS: ${roas}x</div>
            </div>
          `;
        },
      },
      visualMap: {
        show: true,
        type: 'continuous',
        min: minVal,
        max: maxVal,
        inRange: {
          // Pink -> Yellow -> Lime scale
          color: ['#f364cb', '#ffd23f', '#82e66f'],
        },
        text: [`${maxVal.toFixed(1)}x`, `${minVal.toFixed(1)}x`],
        textStyle: { color: '#000000', fontSize: 10, fontFamily: "'Space Grotesk', monospace", fontWeight: 'bold' },
        orient: 'vertical',
        right: 4,
        top: 'middle',
        itemWidth: 14,
        itemHeight: 110,
        precision: 1,
      },
      xAxis: {
        type: 'category',
        data: days,
        axisLabel: {
          color: '#000000',
          fontSize: 10,
          fontFamily: "'Space Grotesk', monospace",
          fontWeight: 600,
          rotate: 30,
          interval: 0,
        },
        axisLine: { lineStyle: { color: '#000000', width: 2 } },
        axisTick: { show: false },
        splitArea: { show: false },
      },
      yAxis: {
        type: 'category',
        data: campaigns,
        axisLabel: {
          color: '#000000',
          fontSize: 10,
          fontFamily: "'Space Grotesk', monospace",
          fontWeight: 600,
          rich: {
            fatigue: { color: '#000000', backgroundColor: '#f364cb', padding: [2, 4], fontWeight: 700 },
          },
          formatter: (v: string) =>
            v === 'camp_meta_03' ? `{fatigue|${v}}` : v,
        },
        axisLine: { lineStyle: { color: '#000000', width: 2 } },
        axisTick: { show: false },
        splitArea: { show: false },
      },
      series: [
        {
          name: 'ROAS',
          type: 'heatmap',
          data: echartsData,
          label: {
            show: true,
            formatter: (params: Record<string, unknown>) => {
              const val = (params.data as [number, number, number])[2];
              return val.toFixed(1);
            },
            color: '#000000',
            fontSize: 10,
            fontFamily: "'Space Grotesk', monospace",
            fontWeight: 700,
          },
          itemStyle: {
            borderColor: '#000000',
            borderWidth: 1,
          },
          emphasis: {
            itemStyle: {
              borderWidth: 2,
              borderColor: '#000000',
            },
          },
          // Overlay to flag the fatigue row with pink callout border
          markArea: fatigueIdx >= 0
            ? {
                silent: true,
                data: [
                  [
                    { yAxis: fatigueIdx - 0.5, itemStyle: { color: 'rgba(243,100,203,0.15)', borderColor: '#f364cb', borderWidth: 2 } },
                    { yAxis: fatigueIdx + 0.5 },
                  ],
                ],
              }
            : undefined,
        },
      ],
    };
  }, [data, campaigns, days]);

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="No heatmap data"
        description="Campaign ROAS heatmap will appear here once data is loaded."
        style={{ minHeight: height }}
      />
    );
  }

  return (
    <div
      className={`adpilot-heatmap-chart ${className}`.trim()}
      style={{ width: '100%', ...style }}
      aria-label="Campaign ROAS heatmap across 14 simulation days — camp_meta_03 shows creative fatigue"
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

export default HeatmapChart;
