// frontend/src/components/charts/BubbleChart.tsx
// Invente '26 Neo-Brutalist ECharts Bubble Chart
import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { SKUBubble } from '../../types/api';
import { palette } from '../../theme/tokens';

interface Props {
  data?: SKUBubble[];
  onSkuClick?: (sku: string) => void;
  highlightedSku?: string | null;
}

const QUADRANT_COLORS: Record<string, string> = {
  scale:   palette?.accent?.lime   || '#82e66f',
  protect: palette?.accent?.yellow || '#ffd23f',
  pause:   palette?.accent?.pink   || '#f364cb',
  fix:     palette?.accent?.cyan   || '#78dbf6',
};

function bubbleSize(spend: number): number {
  const safeSpend = Math.max(0, spend || 0);
  return Math.min(60, Math.max(12, Math.sqrt(safeSpend) * 2.5));
}

function tooltipHtml(b: SKUBubble): string {
  if (!b) return '';
  const spend = b.spend ?? 0;
  const revenue = b.revenue ?? 0;
  const marginPct = b.margin_pct ?? 0;
  const daysCover = b.days_of_cover ?? 0;
  const roas = spend > 0 ? (revenue / spend).toFixed(2) : '—';
  const quadrant = b.quadrant || 'scale';
  const qColor = QUADRANT_COLORS[quadrant] ?? '#cccccc';
  const name = b.name || b.sku || 'SKU Item';
  const sku = b.sku || '';
  const category = b.category || '';
  const oppScore = b.opportunity_score ?? 0;

  const displayMargin = marginPct <= 1 ? (marginPct * 100).toFixed(1) : marginPct.toFixed(1);

  return `
    <div style="
      font-family:'Space Grotesk',monospace,sans-serif;
      background:#ffffff;border:3px solid #000000;
      box-shadow:4px 4px 0px #000000;padding:14px 16px;
      min-width:220px;color:#000000;
    ">
      <div style="font-size:13px;font-weight:900;text-transform:uppercase;border-bottom:2px solid #000000;padding-bottom:6px;margin-bottom:8px;color:#000000;">
        ${name}
      </div>
      <div style="font-size:11px;color:#444444;margin-bottom:8px;font-weight:600;">${sku} · ${category}</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;color:#000000;">
        <tr><td style="padding:2px 0;color:#333333;font-weight:600;">Margin</td>
            <td style="padding:2px 0;text-align:right;font-weight:900;color:#000000;">${displayMargin}%</td></tr>
        <tr><td style="padding:2px 0;color:#333333;font-weight:600;">Cover</td>
            <td style="padding:2px 0;text-align:right;font-weight:900;color:#000000;">${daysCover.toFixed(1)}d</td></tr>
        <tr><td style="padding:2px 0;color:#333333;font-weight:600;">Spend (7d)</td>
            <td style="padding:2px 0;text-align:right;font-weight:900;color:#000000;">$${spend.toLocaleString()}</td></tr>
        <tr><td style="padding:2px 0;color:#333333;font-weight:600;">Revenue</td>
            <td style="padding:2px 0;text-align:right;font-weight:900;color:#000000;">$${revenue.toLocaleString()}</td></tr>
        <tr><td style="padding:2px 0;color:#333333;font-weight:600;">ROAS</td>
            <td style="padding:2px 0;text-align:right;font-weight:900;color:#000000;">${roas}×</td></tr>
      </table>
      <div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center;">
        <div style="
          background:${qColor};color:#000000;border:2px solid #000000;
          font-size:10px;font-weight:900;text-transform:uppercase;
          padding:2px 10px;letter-spacing:0.05em;
        ">${quadrant.toUpperCase()}</div>
        <div style="font-size:11px;font-weight:900;color:#000000;">OPP: ${oppScore}</div>
      </div>
    </div>
  `;
}

export function BubbleChart({ data, onSkuClick, highlightedSku }: Props) {
  // Empty data fallback box
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div style={{
        height: '450px',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '3px solid #000000',
        background: '#f3f3ed',
        fontFamily: "'Space Grotesk', monospace, sans-serif",
        fontWeight: 700,
        fontSize: 14,
        color: '#000000',
        textTransform: 'uppercase',
      }}>
        No SKU data available to plot
      </div>
    );
  }

  const quadrants = ['scale', 'protect', 'pause', 'fix'] as const;
  const quadrantLabels: Record<string, string> = {
    scale: 'Scale', protect: 'Protect', pause: 'Pause', fix: 'Fix',
  };

  const series = quadrants.map(q => {
    const items = data.filter(b => (b?.quadrant || 'scale') === q);
    return {
      name: quadrantLabels[q],
      type: 'scatter',
      data: items.map(b => {
        const rawMargin = b?.margin_pct ?? 0;
        const marginPctNormalized = rawMargin <= 1 ? rawMargin * 100 : rawMargin;
        const daysCover = b?.days_of_cover ?? 0;
        const spend = b?.spend ?? 0;
        const sku = b?.sku || '';

        return {
          value: [daysCover, marginPctNormalized, bubbleSize(spend)],
          _bubble: b,
          itemStyle: {
            color: QUADRANT_COLORS[q] || '#ccc',
            borderColor: '#000000',
            borderWidth: highlightedSku === sku ? 4 : 2,
            shadowColor: highlightedSku === sku ? '#000000' : 'transparent',
            shadowBlur: highlightedSku === sku ? 10 : 0,
            opacity: highlightedSku && highlightedSku !== sku ? 0.35 : 1,
          },
        };
      }),
      symbolSize: (val: number[]) => (Array.isArray(val) ? val[2] ?? 20 : 20),
      markArea: {
        silent: true,
        data: [[
          { x: q === 'scale' || q === 'protect' ? '50%' : '0%',
            y: q === 'scale' || q === 'fix' ? '0%' : '50%' },
          { x: q === 'scale' || q === 'protect' ? '100%' : '50%',
            y: q === 'scale' || q === 'fix' ? '50%' : '100%' },
        ]],
        itemStyle: {
          color: QUADRANT_COLORS[q] || '#ccc',
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
        fontFamily: "'Space Grotesk', monospace, sans-serif",
        fontSize: 11,
        fontWeight: 700,
        color: '#000000',
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
        const b = raw?.data?._bubble;
        return b ? tooltipHtml(b) : '';
      },
    },
    xAxis: {
      name: 'Days of Cover',
      nameLocation: 'middle',
      nameGap: 36,
      nameTextStyle: {
        fontFamily: "'Space Grotesk', monospace, sans-serif",
        fontSize: 11,
        fontWeight: 700,
        color: '#000000',
        textTransform: 'uppercase',
      },
      type: 'value',
      min: 0,
      axisLine: { show: true, lineStyle: { color: '#000000', width: 2 } },
      axisTick: { show: true, lineStyle: { color: '#000000', width: 1 } },
      axisLabel: {
        fontFamily: "'Space Grotesk', monospace, sans-serif",
        fontSize: 11,
        fontWeight: 700,
        color: '#000000',
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
        fontFamily: "'Space Grotesk', monospace, sans-serif",
        fontSize: 11,
        fontWeight: 700,
        color: '#000000',
        textTransform: 'uppercase',
      },
      type: 'value',
      min: 0,
      max: 100,
      axisLine: { show: true, lineStyle: { color: '#000000', width: 2 } },
      axisTick: { show: true, lineStyle: { color: '#000000', width: 1 } },
      axisLabel: {
        fontFamily: "'Space Grotesk', monospace, sans-serif",
        fontSize: 11,
        fontWeight: 700,
        color: '#000000',
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
    <div style={{ height: '450px', width: '100%', position: 'relative' }}>
      <ReactECharts
        option={option}
        style={{ height: '450px', width: '100%' }}
        onEvents={{
          click: (params: unknown) => {
            const raw = params as { data?: { _bubble?: SKUBubble } };
            const b = raw?.data?._bubble;
            if (b?.sku && onSkuClick) onSkuClick(b.sku);
          },
        }}
      />
    </div>
  );
}

export default BubbleChart;

