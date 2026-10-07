import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { SKUBubble, Quadrant } from '../../types/api';
import { colors, quadrantMeta } from '../../theme/tokens';

interface BubbleChartProps {
  data: SKUBubble[];
  onSkuClick?: (sku: string) => void;
  highlightedSku?: string | null;
  className?: string;
}

const QUADRANT_KEYS: Quadrant[] = ['scale', 'protect', 'pause', 'fix'];

function bubbleSize(spend: number): number {
  const raw = Math.sqrt(Math.max(spend, 0)) * 2;
  return Math.max(10, Math.min(60, raw));
}

function tooltipHtml(b: SKUBubble): string {
  const roas = b.spend > 0 ? (b.revenue / b.spend).toFixed(2) : '—';
  const qMeta = quadrantMeta[b.quadrant];
  return `
    <div style="font-family:Inter,sans-serif;min-width:200px;">
      <div style="font-weight:700;font-size:13px;color:#e2e8f0;margin-bottom:6px;">
        ${b.sku} — ${b.name}
      </div>
      <div style="color:#94a3b8;font-size:11px;margin-bottom:8px;">${b.category}</div>
      <table style="width:100%;font-size:12px;border-collapse:collapse;">
        ${row('Margin', `${b.margin_pct.toFixed(1)}%`)}
        ${row('Cover', `${b.days_of_cover.toFixed(1)} days`)}
        ${row('Spend (7d)', `$${b.spend.toLocaleString()}`)}
        ${row('Revenue (7d)', `$${b.revenue.toLocaleString()}`)}
        ${row('ROAS', `${roas}x`)}
        ${row('Opportunity', `${b.opportunity_score.toFixed(0)}/100`)}
      </table>
      <div style="margin-top:8px;padding:4px 8px;border-radius:4px;
                  background:${qMeta.bg};color:${qMeta.color};
                  font-size:11px;font-weight:600;text-transform:uppercase;text-align:center;">
        ${qMeta.label}
      </div>
    </div>`;
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="color:#64748b;padding:2px 0;">${label}</td>
    <td style="color:#e2e8f0;text-align:right;padding:2px 0;">${value}</td>
  </tr>`;
}

export const BubbleChart: React.FC<BubbleChartProps> = ({
  data,
  onSkuClick,
  highlightedSku,
  className,
}) => {
  // Split data into per-quadrant series
  const seriesData = useMemo(() => {
    const byQuadrant: Record<Quadrant, SKUBubble[]> = {
      scale: [], protect: [], pause: [], fix: [],
    };
    for (const b of data) byQuadrant[b.quadrant].push(b);
    return byQuadrant;
  }, [data]);

  const maxDays = useMemo(() => Math.max(...data.map(d => d.days_of_cover), 30), [data]);

  const option = useMemo<EChartsOption>(() => {
    const series = QUADRANT_KEYS.map(q => ({
      name: quadrantMeta[q].label,
      type: 'scatter' as const,
      data: seriesData[q].map(b => ({
        value: [b.days_of_cover, b.margin_pct, b.spend],
        name: b.sku,
        itemStyle: {
          color: quadrantMeta[q].color,
          opacity: highlightedSku && highlightedSku !== b.sku ? 0.3 : 0.85,
          shadowBlur: highlightedSku === b.sku ? 20 : 0,
          shadowColor: quadrantMeta[q].color,
          borderColor: highlightedSku === b.sku ? '#fff' : 'transparent',
          borderWidth: highlightedSku === b.sku ? 2 : 0,
        },
        // Store full bubble for tooltip
        _bubble: b,
      })),
      symbolSize: (val: number[]) => bubbleSize(val[2]),
      emphasis: {
        scale: true,
        itemStyle: { shadowBlur: 24, shadowColor: quadrantMeta[q].color },
      },
    }));

    return {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 800,
      animationEasing: 'cubicOut',

      grid: { left: 60, right: 20, top: 20, bottom: 50 },

      xAxis: {
        name: 'Days of Cover',
        nameLocation: 'middle',
        nameGap: 32,
        nameTextStyle: { color: colors.muted, fontSize: 12 },
        type: 'value',
        min: 0,
        max: maxDays + 5,
        axisLine: { lineStyle: { color: colors.border } },
        axisLabel: { color: colors.muted, fontSize: 11 },
        splitLine: { lineStyle: { color: colors.border, type: 'dashed', opacity: 0.5 } },
      },

      yAxis: {
        name: 'Margin %',
        nameLocation: 'middle',
        nameGap: 45,
        nameTextStyle: { color: colors.muted, fontSize: 12 },
        type: 'value',
        min: 0,
        max: 100,
        axisLine: { lineStyle: { color: colors.border } },
        axisLabel: {
          color: colors.muted,
          fontSize: 11,
          formatter: (v: number) => `${v}%`,
        },
        splitLine: { lineStyle: { color: colors.border, type: 'dashed', opacity: 0.5 } },
      },

      tooltip: {
        trigger: 'item',
        backgroundColor: '#111827',
        borderColor: '#1f2d45',
        borderWidth: 1,
        padding: 12,
        extraCssText: 'box-shadow:0 8px 32px rgba(0,0,0,0.6);border-radius:8px;',
        formatter: (params: unknown) => {
          const raw = params as { data?: { _bubble?: SKUBubble } };
          const b = raw.data?._bubble;
          return b ? tooltipHtml(b) : '';
        },
      },

      legend: {
        top: 8,
        right: 8,
        orient: 'horizontal',
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 16,
        textStyle: { color: colors.muted, fontSize: 11 },
        data: QUADRANT_KEYS.map(q => ({
          name: quadrantMeta[q].label,
          icon: 'circle',
          itemStyle: { color: quadrantMeta[q].color },
        })),
      },

      series,
    };
  }, [seriesData, maxDays, highlightedSku]);

  const onEvents: Record<string, (params: unknown) => void> = {
    click: (params: unknown) => {
      const p = params as { data?: { name?: string } };
      const sku = p.data?.name;
      if (sku && onSkuClick) onSkuClick(sku);
    },
  };

  return (
    <ReactECharts
      option={option}
      onEvents={onEvents}
      className={className}
      style={{ width: '100%', minHeight: 400 }}
      opts={{ renderer: 'canvas' }}
    />
  );
};

export default BubbleChart;
