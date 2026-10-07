// frontend/src/components/charts/BubbleChart.tsx
// Invente '26 Neo-Brutalist ECharts Bubble Chart
import ReactECharts from 'echarts-for-react';
import type { SKUBubble } from '../../types/api';
import { palette } from '../../theme/tokens';

interface Props {
  data: SKUBubble[];
  onSkuClick?: (sku: string) => void;
  highlightedSku?: string | null;
}

const QUADRANT_COLORS: Record<string, string> = {
  scale:   palette.accent.lime,
  protect: palette.accent.yellow,
  pause:   palette.accent.pink,
  fix:     palette.accent.cyan,
};

function bubbleSize(spend: number): number {
  return Math.min(60, Math.max(12, Math.sqrt(spend) * 2.5));
}

function tooltipHtml(b: SKUBubble): string {
  const roas = b.spend > 0 ? (b.revenue / b.spend).toFixed(2) : '—';
  const qColor = QUADRANT_COLORS[b.quadrant] ?? '#ccc';
  return `
    <div style="
      font-family:'Space Grotesk',monospace,sans-serif;
      background:#fff;border:3px solid #000;
      box-shadow:4px 4px 0 #000;padding:14px 16px;
      min-width:220px;color:#000;
    ">
      <div style="font-size:13px;font-weight:900;text-transform:uppercase;border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:8px;">
        ${b.name}
      </div>
      <div style="font-size:11px;color:#666;margin-bottom:8px;font-weight:600;">${b.sku} · ${b.category}</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <tr><td style="padding:2px 0;color:#333;font-weight:600;">Margin</td>
            <td style="padding:2px 0;text-align:right;font-weight:900;">${b.margin_pct.toFixed(1)}%</td></tr>
        <tr><td style="padding:2px 0;color:#333;font-weight:600;">Cover</td>
            <td style="padding:2px 0;text-align:right;font-weight:900;">${b.days_of_cover.toFixed(1)}d</td></tr>
        <tr><td style="padding:2px 0;color:#333;font-weight:600;">Spend (7d)</td>
            <td style="padding:2px 0;text-align:right;font-weight:900;">$${b.spend.toLocaleString()}</td></tr>
        <tr><td style="padding:2px 0;color:#333;font-weight:600;">Revenue</td>
            <td style="padding:2px 0;text-align:right;font-weight:900;">$${b.revenue.toLocaleString()}</td></tr>
        <tr><td style="padding:2px 0;color:#333;font-weight:600;">ROAS</td>
            <td style="padding:2px 0;text-align:right;font-weight:900;">${roas}×</td></tr>
      </table>
      <div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center;">
        <div style="
          background:${qColor};color:#000;border:2px solid #000;
          font-size:10px;font-weight:900;text-transform:uppercase;
          padding:2px 10px;letter-spacing:0.05em;
        ">${b.quadrant.toUpperCase()}</div>
        <div style="font-size:11px;font-weight:900;">OPP: ${b.opportunity_score}</div>
      </div>
    </div>
  `;
}

export function BubbleChart({ data, onSkuClick, highlightedSku }: Props) {
  // Build one scatter series per quadrant so they get individual colors + legend
  const quadrants = ['scale', 'protect', 'pause', 'fix'] as const;
  const quadrantLabels: Record<string, string> = {
    scale: 'Scale', protect: 'Protect', pause: 'Pause', fix: 'Fix',
  };

  const series = quadrants.map(q => {
    const items = data.filter(b => b.quadrant === q);
    return {
      name: quadrantLabels[q],
      type: 'scatter',
      data: items.map(b => {
        const marginPctNormalized = b.margin_pct <= 1 ? b.margin_pct * 100 : b.margin_pct;
        return {
          value: [b.days_of_cover, marginPctNormalized, bubbleSize(b.spend)],
          _bubble: b,
          // Highlighted bubble gets a bold ring
          itemStyle: {
            color: QUADRANT_COLORS[q],
            borderColor: '#000000',
            borderWidth: highlightedSku === b.sku ? 4 : 2,
            shadowColor: highlightedSku === b.sku ? '#000000' : 'transparent',
            shadowBlur: highlightedSku === b.sku ? 10 : 0,
            opacity: highlightedSku && highlightedSku !== b.sku ? 0.35 : 1,
          },
        };
      }),
      symbolSize: (val: number[]) => val[2],
      // Quadrant background tint via markArea
      markArea: {
        silent: true,
        data: [[
          { x: q === 'scale' || q === 'protect' ? '50%' : '0%',
            y: q === 'scale' || q === 'fix' ? '0%' : '50%' },
          { x: q === 'scale' || q === 'protect' ? '100%' : '50%',
            y: q === 'scale' || q === 'fix' ? '50%' : '100%' },
        ]],
        itemStyle: {
          color: QUADRANT_COLORS[q],
          opacity: 0.07,
        },
      },
    };
  });

  const option = {
    backgroundColor: 'transparent',
    grid: { top: 40, right: 20, bottom: 60, left: 60, containLabel: true },

    legend: {
      top: 4,
      right: 8,
      orient: 'horizontal',
      itemWidth: 14,
      itemHeight: 14,
      textStyle: {
        fontFamily: "'Space Grotesk', monospace",
        fontSize: 11,
        fontWeight: 700,
        color: '#000',
        textTransform: 'uppercase',
      },
    },

    tooltip: {
      trigger: 'item',
      backgroundColor: 'transparent',
      borderWidth: 0,
      padding: 0,
      formatter: (params: unknown) => {
        const raw = params as { data?: { _bubble?: SKUBubble } };
        const b = raw.data?._bubble;
        return b ? tooltipHtml(b) : '';
      },
    },

    xAxis: {
      name: 'Days of Cover',
      nameLocation: 'middle',
      nameGap: 36,
      nameTextStyle: {
        fontFamily: "'Space Grotesk', monospace",
        fontSize: 11,
        fontWeight: 700,
        color: '#000',
        textTransform: 'uppercase',
      },
      type: 'value',
      min: 0,
      axisLine: { show: true, lineStyle: { color: '#000', width: 2 } },
      axisTick: { show: true, lineStyle: { color: '#000', width: 1 } },
      axisLabel: {
        fontFamily: "'Space Grotesk', monospace",
        fontSize: 11,
        fontWeight: 700,
        color: '#000',
      },
      splitLine: {
        show: true,
        lineStyle: { color: '#e1e1d8', type: 'dotted', width: 1 },
      },
    },

    yAxis: {
      name: 'Margin %',
      nameLocation: 'middle',
      nameGap: 44,
      nameTextStyle: {
        fontFamily: "'Space Grotesk', monospace",
        fontSize: 11,
        fontWeight: 700,
        color: '#000',
        textTransform: 'uppercase',
      },
      type: 'value',
      min: 0,
      max: 100,
      axisLine: { show: true, lineStyle: { color: '#000', width: 2 } },
      axisTick: { show: true, lineStyle: { color: '#000', width: 1 } },
      axisLabel: {
        fontFamily: "'Space Grotesk', monospace",
        fontSize: 11,
        fontWeight: 700,
        color: '#000',
        formatter: '{value}%',
      },
      splitLine: {
        show: true,
        lineStyle: { color: '#e1e1d8', type: 'dotted', width: 1 },
      },
    },

    series,
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: 420, width: '100%' }}
      onEvents={{
        click: (params: unknown) => {
          const raw = params as { data?: { _bubble?: SKUBubble } };
          const b = raw.data?._bubble;
          if (b && onSkuClick) onSkuClick(b.sku);
        },
      }}
    />
  );
}
