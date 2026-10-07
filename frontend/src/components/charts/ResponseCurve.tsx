import React, { useMemo, Component, type ErrorInfo, type ReactNode } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

class CurveErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('Response curve chart caught rendering error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#1f2d45] bg-[#111827] p-8 text-center text-xs text-[#94a3b8]">
          Unable to render response curve chart.
        </div>
      );
    }
    return this.props.children;
  }
}

export interface CurvePointData {
  spend: number;
  revenue_low: number;
  revenue_mid: number;
  revenue_high: number;
}

export interface ResponseCurveProps {
  campaignId: string;
  sku?: string;
  dataPoints: CurvePointData[];
  currentSpend: number;
  recommendedSpend: number;
  opportunityScore?: number;
  height?: string;
}

export const ResponseCurve: React.FC<ResponseCurveProps> = ({
  campaignId,
  sku,
  dataPoints = [],
  currentSpend,
  recommendedSpend,
  opportunityScore,
  height = '320px',
}) => {
  // Empty state handling
  if (!dataPoints || dataPoints.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-xl border border-[#1f2d45] bg-[#111827] p-8 text-center"
        style={{ height }}
      >
        <div className="mb-2 text-sm font-semibold text-[#94a3b8]">No Response Curve Available</div>
        <p className="text-xs text-[#64748b]">
          Insufficient ad performance data to fit the Hill curve for {campaignId}.
        </p>
      </div>
    );
  }

  // Sort data points by spend
  const sortedPoints = useMemo(() => {
    return [...dataPoints].sort((a, b) => a.spend - b.spend);
  }, [dataPoints]);

  // Interpolate expected revenue at given spend level
  const interpolateRevenue = (targetSpend: number): CurvePointData => {
    if (sortedPoints.length === 0) {
      return { spend: targetSpend, revenue_low: 0, revenue_mid: 0, revenue_high: 0 };
    }
    if (targetSpend <= sortedPoints[0].spend) {
      return {
        spend: targetSpend,
        revenue_low: sortedPoints[0].revenue_low,
        revenue_mid: sortedPoints[0].revenue_mid,
        revenue_high: sortedPoints[0].revenue_high,
      };
    }
    const last = sortedPoints[sortedPoints.length - 1];
    if (targetSpend >= last.spend) {
      return {
        spend: targetSpend,
        revenue_low: last.revenue_low,
        revenue_mid: last.revenue_mid,
        revenue_high: last.revenue_high,
      };
    }
    for (let i = 0; i < sortedPoints.length - 1; i++) {
      const p1 = sortedPoints[i];
      const p2 = sortedPoints[i + 1];
      if (targetSpend >= p1.spend && targetSpend <= p2.spend) {
        const ratio = (targetSpend - p1.spend) / (p2.spend - p1.spend || 1);
        return {
          spend: targetSpend,
          revenue_low: p1.revenue_low + ratio * (p2.revenue_low - p1.revenue_low),
          revenue_mid: p1.revenue_mid + ratio * (p2.revenue_mid - p1.revenue_mid),
          revenue_high: p1.revenue_high + ratio * (p2.revenue_high - p1.revenue_high),
        };
      }
    }
    return sortedPoints[0];
  };

  const curRev = interpolateRevenue(currentSpend);
  const recRev = interpolateRevenue(recommendedSpend);

  const option = useMemo<EChartsOption>(() => {
    return {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 800,
      grid: {
        top: 36,
        right: 28,
        bottom: 38,
        left: 60,
        containLabel: false,
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#0a0d14',
        borderColor: '#1f2d45',
        borderWidth: 1,
        padding: [10, 14],
        textStyle: {
          color: '#e2e8f0',
          fontFamily: 'Inter, sans-serif',
          fontSize: 12,
        },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const dataIndex = params[0].dataIndex;
          const pt = sortedPoints[dataIndex];
          if (!pt) return '';

          return `
            <div style="font-family:Inter,sans-serif;min-width:180px;">
              <div style="font-weight:700;font-size:13px;color:#e2e8f0;margin-bottom:6px;">
                Spend: $${pt.spend.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
              <table style="width:100%;font-size:12px;border-collapse:collapse;">
                <tr>
                  <td style="color:#60a5fa;padding:2px 0;">Expected (Mid):</td>
                  <td style="color:#e2e8f0;text-align:right;font-weight:600;">$${pt.revenue_mid.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                </tr>
                <tr>
                  <td style="color:#34d399;padding:2px 0;">Conservative (Low):</td>
                  <td style="color:#e2e8f0;text-align:right;">$${pt.revenue_low.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                </tr>
                <tr>
                  <td style="color:#93c5fd;padding:2px 0;">Optimistic (High):</td>
                  <td style="color:#e2e8f0;text-align:right;">$${pt.revenue_high.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                </tr>
              </table>
            </div>
          `;
        },
      },
      xAxis: {
        type: 'value',
        name: 'Spend ($)',
        nameLocation: 'middle',
        nameGap: 24,
        nameTextStyle: {
          color: '#64748b',
          fontSize: 11,
        },
        axisLabel: {
          color: '#64748b',
          fontSize: 11,
          formatter: (v: number) => `$${v}`,
        },
        axisLine: { lineStyle: { color: '#1f2d45' } },
        splitLine: { lineStyle: { color: '#141d2e', type: 'dashed' } },
      },
      yAxis: {
        type: 'value',
        name: 'Revenue ($)',
        nameTextStyle: {
          color: '#64748b',
          fontSize: 11,
        },
        axisLabel: {
          color: '#64748b',
          fontSize: 11,
          formatter: (v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`,
        },
        axisLine: { lineStyle: { color: '#1f2d45' } },
        splitLine: { lineStyle: { color: '#141d2e', type: 'dashed' } },
      },
      series: [
        // 1. Lower bound (stacked baseline, invisible)
        {
          name: 'Low Bound Base',
          type: 'line',
          data: sortedPoints.map((p) => [p.spend, p.revenue_low]),
          stack: 'confidence-band',
          symbol: 'none',
          lineStyle: { opacity: 0 },
          areaStyle: { color: 'transparent' },
          silent: true,
        },
        // 2. High - Low difference (shaded confidence band)
        {
          name: '95% Confidence Band',
          type: 'line',
          data: sortedPoints.map((p) => [p.spend, Math.max(0, p.revenue_high - p.revenue_low)]),
          stack: 'confidence-band',
          symbol: 'none',
          lineStyle: { opacity: 0 },
          areaStyle: {
            color: 'rgba(59, 130, 246, 0.16)',
          },
          silent: true,
        },
        // 3. Expected revenue mid prediction line
        {
          name: 'Expected Revenue (Mid)',
          type: 'line',
          data: sortedPoints.map((p) => [p.spend, p.revenue_mid]),
          smooth: true,
          showSymbol: false,
          symbolSize: 6,
          lineStyle: {
            color: '#3b82f6',
            width: 2.7,
            shadowColor: 'rgba(59, 130, 246, 0.35)',
            shadowBlur: 6,
          },
          markLine: {
            silent: false,
            symbol: ['none', 'none'],
            data: [
              // Current Spend Marker
              {
                name: 'Current Spend',
                xAxis: currentSpend,
                lineStyle: {
                  type: 'dotted',
                  color: '#f43f5e',
                  width: 2,
                },
                label: {
                  show: true,
                  position: 'insideEndTop',
                  color: '#f43f5e',
                  fontSize: 10,
                  formatter: `Current\n$${Math.round(currentSpend)}`,
                },
                tooltip: {
                  formatter: () =>
                    `<b>Current Spend:</b> $${Math.round(currentSpend)}<br/><b>Expected Revenue:</b> $${Math.round(curRev.revenue_mid)}`,
                },
              },
              // Recommended Spend Marker
              {
                name: 'Recommended Spend',
                xAxis: recommendedSpend,
                lineStyle: {
                  type: 'dashed',
                  color: '#00ff88',
                  width: 2,
                },
                label: {
                  show: true,
                  position: 'insideStartTop',
                  color: '#00ff88',
                  fontSize: 10,
                  formatter: `Rec\n$${Math.round(recommendedSpend)}`,
                },
                tooltip: {
                  formatter: () =>
                    `<b>Recommended Spend:</b> $${Math.round(recommendedSpend)}<br/><b>Expected Revenue (conservative):</b> $${Math.round(recRev.revenue_low)}`,
                },
              },
            ],
          },
        },
        // 4. Point markers on curve for current & recommended spends
        {
          name: 'Spend Markers',
          type: 'scatter',
          data: [
            {
              value: [currentSpend, curRev.revenue_mid],
              itemStyle: { color: '#f43f5e', borderColor: '#ffffff', borderWidth: 2 },
              symbolSize: 10,
              tooltip: {
                formatter: () =>
                  `<b>Current Spend:</b> $${Math.round(currentSpend)}<br/><b>Expected Revenue:</b> $${Math.round(curRev.revenue_mid)}`,
              },
            },
            {
              value: [recommendedSpend, recRev.revenue_mid],
              itemStyle: { color: '#00ff88', borderColor: '#ffffff', borderWidth: 2 },
              symbolSize: 12,
              tooltip: {
                formatter: () =>
                  `<b>Recommended Spend:</b> $${Math.round(recommendedSpend)}<br/><b>Expected Revenue:</b> $${Math.round(recRev.revenue_mid)} (Conservative: $${Math.round(recRev.revenue_low)})`,
              },
            },
          ],
        },
      ],
    };
  }, [sortedPoints, currentSpend, recommendedSpend, curRev, recRev]);

  return (
    <CurveErrorBoundary>
      <div className="relative w-full rounded-xl border border-[#1f2d45] bg-[#111827] p-4">
      {/* Header Bar */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-[#e2e8f0]">{campaignId}</span>
          {sku && (
            <span className="rounded bg-[#1a2235] px-2 py-0.5 text-[10px] font-mono text-[#94a3b8]">
              {sku}
            </span>
          )}
        </div>
        {opportunityScore !== undefined && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[#64748b]">Opportunity:</span>
            <span
              className={`rounded px-1.5 py-0.5 text-xs font-bold ${
                opportunityScore >= 70
                  ? 'bg-[#00ff88]/10 text-[#00ff88]'
                  : opportunityScore >= 40
                  ? 'bg-[#ffb800]/10 text-[#ffb800]'
                  : 'bg-[#ff4466]/10 text-[#ff4466]'
              }`}
            >
              {Math.round(opportunityScore)}/100
            </span>
          </div>
        )}
      </div>

      {/* Chart */}
      <div style={{ height }}>
        <ReactECharts
          option={option}
          style={{ height: '100%', width: '100%' }}
          notMerge={true}
          lazyUpdate={true}
        />
      </div>

      {/* Legend & Summary */}
      <div className="mt-2 flex flex-wrap items-center justify-between border-t border-[#1f2d45] pt-2 text-[11px] text-[#64748b]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#f43f5e]" />
            <span>Current: ${Math.round(currentSpend)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#00ff88]" />
            <span>Recommended: ${Math.round(recommendedSpend)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px]">
          <span className="h-2 w-3 rounded-sm bg-[#3b82f6]/20 border border-[#3b82f6]/40" />
          <span>95% Confidence Band</span>
        </div>
      </div>
    </div>
  </CurveErrorBoundary>
);
};

export default ResponseCurve;
